# -*- coding: utf-8 -*-
"""Diagramme d'architecture en couches — IAT Academy.

Palette de marque IAT Academy (navy/gold, cohérente avec les diagrammes de
classes UML) : navy pour le flux applicatif interne, gold pour les
intégrations externes, bleu-gris pour la couche données. Arêtes en angle
droit (splines="ortho"), clusters à fond teinté, icônes Twemoji (CC BY 4.0,
https://github.com/twitter/twemoji) pour les intégrations externes qui
n'ont pas d'icône de marque dédiée dans mingrammer.

Génère diagrammes/images/diagramme_architecture.png (300 DPI, orientation
portrait).

Usage : python diagramme_architecture.py
"""

import os

from diagrams import Cluster, Diagram, Edge
from diagrams.custom import Custom
from diagrams.generic.storage import Storage
from diagrams.onprem.client import Users
from diagrams.onprem.compute import Server
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.security import Vault
from diagrams.programming.framework import Spring

# Palette de marque IAT Academy
NAVY = "#142B4B"
NAVY_MUTED = "#3A5A84"
GOLD = "#C97612"

GRAPH_ATTR = {
    "dpi": "300",
    "fontsize": "24",
    "fontname": "Helvetica-Bold",
    "fontcolor": NAVY,
    "bgcolor": "white",
    "pad": "0.4",
    "nodesep": "0.6",
    "ranksep": "0.75",
    "splines": "ortho",
}
NODE_ATTR = {"fontsize": "15", "fontname": "Helvetica", "fontcolor": NAVY}
EDGE_ATTR = {"fontsize": "12", "fontname": "Helvetica", "penwidth": "1.6"}

ICONS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")

with Diagram(
    "Architecture en couches - IAT Academy",
    filename="../images/diagramme_architecture",
    show=False,
    direction="TB",
    graph_attr=GRAPH_ATTR,
    node_attr=NODE_ATTR,
    edge_attr=EDGE_ATTR,
    outformat="png",
):
    client = Users("Navigateur\n(Next.js / frontend)")

    with Cluster(
        "Backend Spring Boot",
        graph_attr={"bgcolor": "#EAF2FB", "pencolor": NAVY, "fontcolor": NAVY},
    ):
        security = Vault("Sécurité\nJWT + RBAC")
        controller = Spring("Contrôleurs REST\n(31 @RestController)")
        service = Spring("Services métier\n(logique applicative)")
        repository = Server("Repositories\nSpring Data JPA")

        (
            security
            >> Edge(color=NAVY, style="bold", label="requête validée")
            >> controller
            >> Edge(color=NAVY, style="bold", label="délègue")
            >> service
            >> Edge(color=NAVY, style="bold", label="persiste")
            >> repository
        )

    with Cluster(
        "Données",
        graph_attr={"bgcolor": "#EAF2FB", "pencolor": NAVY, "fontcolor": NAVY},
    ):
        db = PostgreSQL("PostgreSQL\n(migrations Flyway)")
        cache = Redis("Redis\n(rate-limit, verrous,\nsessions quiz)")

    with Cluster(
        "Intégrations externes",
        graph_attr={"bgcolor": "#FFF8EC", "pencolor": GOLD, "fontcolor": NAVY},
    ):
        ia = Custom("APIs IA\n(Gemini / Grok)", f"{ICONS}/ai.png")
        video = Custom("Bunny Stream\n(vidéo)", f"{ICONS}/video.png")
        smtp = Custom("Serveur SMTP\n(email)", f"{ICONS}/email.png")

    disk = Storage("Stockage disque\n(data/media)")

    client >> Edge(color=NAVY, style="bold", label="HTTPS / cookie JWT httpOnly") >> security
    repository >> Edge(color=NAVY_MUTED, style="bold", label="JDBC") >> db
    service >> Edge(color=NAVY_MUTED, style="dashed", label="rate-limit, verrous") >> cache
    service >> Edge(color=GOLD, style="dashed", label="génération de questions") >> ia
    service >> Edge(color=GOLD, style="dashed", label="upload / streaming") >> video
    service >> Edge(color=GOLD, style="dashed", label="campagnes, notifications") >> smtp
    service >> Edge(color=NAVY_MUTED, style="dotted", label="PDF / images") >> disk
