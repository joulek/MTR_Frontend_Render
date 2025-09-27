import Devis from "../models/Devis.js";
import DemandeCompression from "../models/DevisCompression.js";
import DemandeTraction    from "../models/DevisTraction.js";
import DemandeTorsion     from "../models/DevisTorsion.js";
import DemandeFil         from "../models/DevisFilDresse.js";
import DemandeGrille      from "../models/DevisGrille.js";
import DemandeAutre       from "../models/DevisAutre.js";

const ORIGIN = process.env.PUBLIC_BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;

export async function listDemandesCompact(req, res) {
  try {
    const page  = Math.max(1, parseInt(req.query.page ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? "20", 10)));
    const skip  = (page - 1) * limit;
    const type  = (req.query.type || "all").toString().toLowerCase();
    const qRaw  = (req.query.q || "").toString().trim();

    const rx = qRaw ? new RegExp(qRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;

    const bases = [
      { model: DemandeCompression, t: "compression" },
      { model: DemandeTraction,    t: "traction" },
      { model: DemandeTorsion,     t: "torsion" },
      { model: DemandeFil,         t: "fil" },
      { model: DemandeGrille,      t: "grille" },
      { model: DemandeAutre,       t: "autre" },
    ];
    const base = bases[0];
    const unions = bases.slice(1);

    const mkMatch = () => {
      if (!rx) return [];
      return [{
        $match: {
          $or: [
            { numero: rx },
            { devisNumero: rx },
            { "devis.numero": rx },
            { "client.nom": rx },
            { "client.prenom": rx },
            // recherche via user (après lookup)
            { "__user.prenom": rx },
            { "__user.nom": rx },
            { "__user.firstName": rx },
            { "__user.lastName": rx },
            { "__user.email": rx },
          ]
        }
      }];
    };

    // ---- Étapes communes par collection (inclut $lookup users) ----
    const commonStages = (typeLiteral) => ([
      // 1) ramener l’utilisateur si le doc contient `user: ObjectId`
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "__userArr",
        }
      },
      {
        $addFields: {
          __user: { $ifNull: [ { $arrayElemAt: ["$__userArr", 0] }, null ] }
        }
      },

      // 2) normaliser champs
      {
        $addFields: {
          __keepId: "$_id",
          __devisNumero: { $ifNull: ["$devisNumero", "$devis.numero"] },

          // ordre prioritaire: client.prenom -> client.firstName -> this.prenom -> user.prenom/firstName
          __first: {
            $ifNull: [
              "$client.prenom",
              { $ifNull: [
                "$client.firstName",
                { $ifNull: [
                  "$prenom",
                  { $ifNull: [
                    "$firstName",
                    { $ifNull: ["$__user.prenom", "$__user.firstName"] }
                  ] }
                ] }
              ] }
            ]
          },
          __last: {
            $ifNull: [
              "$client.nom",
              { $ifNull: [
                "$client.lastName",
                { $ifNull: [
                  "$nom",
                  { $ifNull: ["$lastName", { $ifNull: ["$__user.nom", "$__user.lastName"] }] }
                ] }
              ] }
            ]
          },

          __email:   { $ifNull: [ "$client.email",   { $ifNull: [ "$email",   "$__user.email"   ] } ] },
          __numTel:  { $ifNull: [ "$client.numTel",  { $ifNull: [ "$numTel",  "$__user.numTel"  ] } ] },

          __hasDemandePdf: { $ne: ["$demandePdf", null] },

          // compter pièces jointes (pas besoin des binaires ici)
          __attachmentsCount: {
            $cond: [
              { $isArray: "$documents" },
              { $size: "$documents" },
              0
            ]
          }
        }
      },

      // 3) projection compacte pour la liste
      {
        $project: {
          _id: "$__keepId",
          demandeNumero: "$numero",
          type: { $literal: typeLiteral },
          devisNumero: "$__devisNumero",
          clientName: {
            $trim: { input: { $concat: [ { $ifNull: ["$__first", ""] }, " ", { $ifNull: ["$__last", ""] } ] } }
          },
          client: {
            prenom:  { $ifNull: ["$__first",  ""] },
            nom:     { $ifNull: ["$__last",   ""] },
            email:   { $ifNull: ["$__email",  ""] },
            numTel:  { $ifNull: ["$__numTel", ""] },
          },
          date: "$createdAt",
          hasDemandePdf: "$__hasDemandePdf",
          attachments: "$__attachmentsCount"
        }
      }
    ]);

    const basePipeline = [
      ...mkMatch(),
      ...commonStages(base.t),
    ];

    const unionStages = unions.map(({ model, t }) => ({
      $unionWith: {
        coll: model.collection.name,
        pipeline: [
          ...mkMatch(),
          ...commonStages(t),
        ]
      }
    }));

    const finalPipeline = [
      ...basePipeline,
      ...unionStages,
      ...(type !== "all" ? [{ $match: { type } }] : []),
      { $sort: { date: -1 } },
      {
        $facet: {
          meta:  [{ $count: "total" }],
          items: [{ $skip: skip }, { $limit: limit }],
        }
      },
      {
        $project: {
          total: { $ifNull: [{ $arrayElemAt: ["$meta.total", 0] }, 0] },
          items: 1
        }
      }
    ];

    const [agg] = await base.model.aggregate(finalPipeline).allowDiskUse(true);
    const rows = agg?.items || [];

    const items = rows.map((d) => {
      const ddvPdf   = d.hasDemandePdf ? `${ORIGIN}/api/devis/${d.type}/${d._id}/pdf` : null;
      const devisPdf = d.devisNumero ? `${ORIGIN}/files/devis/${d.devisNumero}.pdf` : null;

      return {
        _id: d._id,
        demandeNumero: d.demandeNumero,
        type: d.type,
        devisNumero: d.devisNumero || null,
        clientName: d.clientName || "",
        client: d.client || { prenom: "", nom: "", email: "", numTel: "" },
        date: d.date,
        hasDemandePdf: !!d.hasDemandePdf,
        ddvPdf,
        devisPdf,
        // juste le nombre (affichage “Fichiers joints”)
        attachments: Number.isFinite(d.attachments) ? d.attachments : 0,
      };
    });

    return res.json({ success: true, page, limit, total: agg?.total || 0, items });
  } catch (e) {
    console.error("listDemandesCompact error:", e);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}
