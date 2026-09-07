# -*- coding: utf-8 -*-
"""Diagramme d'architecture en couches — IAT Academy.

Style inspiré de l'exemple officiel mingrammer "Advanced Web Service with
On-Premises" : arêtes colorées et étiquetées par type de flux, clusters à
fond teinté, imbrication limitée à un seul niveau.

Génère diagrammes/images/diagramme_architecture.png (300 DPI, orientation
portrait).

Usage : python diagramme_architecture.py
"""

from diagrams import Cluster, Diagram, Edge
from diagrams.generic.blank import Blank
from diagrams.generic.storage import Storage
from diagrams.onprem.client import Users
from diagrams.onprem.compute import Server
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.security import Vault
from diagrams.programming.framework import Spring

GRAPH_ATTR = {
    "dpi": "300",
    "fontsize": "24",
    "fontname": "Helvetica-Bold",
    "bgcolor": "white",
    "pad": "0.4",
    "nodesep": "0.6",
    "ranksep": "0.75",
    "splines": "spline",
}
NODE_ATTR = {"fontsize": "15", "fontname": "Helvetica"}
EDGE_ATTR = {"fontsize": "12", "fontname": "Helvetica", "penwidth": "1.6"}

# Palette par type de flux (cohérente avec le diagramme de déploiement)
COLOR_AUTH = "darkgreen"
COLOR_SPINE = "black"
COLOR_CACHE = "firebrick"
COLOR_DB = "steelblue"
COLOR_IA = "darkorange"
COLOR_MEDIA = "mediumvioletred"
COLOR_EMAIL = "slategray"
COLOR_DISK = "saddlebrown"

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

    with Cluster("Backend Spring Boot", graph_attr={"bgcolor": "#EAF2FB"}):
        security = Vault("Sécurité\nJWT + RBAC")
        controller = Spring("Contrôleurs REST\n(29 @RestController)")
        service = Spring("Services métier\n(logique applicative)")
        repository = Server("Repositories\nSpring Data JPA")

        (
            security
            >> Edge(color=COLOR_SPINE, style="bold", label="requête validée")
            >> controller
            >> Edge(color=COLOR_SPINE, style="bold", label="délègue")
            >> service
            >> Edge(color=COLOR_SPINE, style="bold", label="persiste")
            >> repository
        )

    with Cluster("Données", graph_attr={"bgcolor": "#EAF7EF"}):
        db = PostgreSQL("PostgreSQL\n(migrations Flyway)")
        cache = Redis("Redis\n(rate-limit, verrous,\nsessions quiz)")

    with Cluster("Intégrations externes", graph_attr={"bgcolor": "#FDF0E3"}):
        ia = Blank("APIs IA\n(Gemini / Grok)")
        video = Blank("Bunny Stream\n(vidéo)")
        smtp = Blank("Serveur SMTP\n(email)")

    disk = Storage("Stockage disque\n(data/media)")

    client >> Edge(color=COLOR_AUTH, style="bold", label="HTTPS / cookie JWT httpOnly") >> security
    repository >> Edge(color=COLOR_DB, style="bold", label="JDBC") >> db
    service >> Edge(color=COLOR_CACHE, style="dashed", label="rate-limit, verrous") >> cache
    service >> Edge(color=COLOR_IA, style="dashed", label="génération de questions") >> ia
    service >> Edge(color=COLOR_MEDIA, style="dashed", label="upload / streaming") >> video
    service >> Edge(color=COLOR_EMAIL, style="dashed", label="campagnes, notifications") >> smtp
    service >> Edge(color=COLOR_DISK, style="dotted", label="PDF / images") >> disk
