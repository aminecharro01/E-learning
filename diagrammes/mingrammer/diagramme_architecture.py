# -*- coding: utf-8 -*-
"""Diagramme d'architecture en couches — IAT Academy.

Genere diagrammes/images/diagramme_architecture.png (300 DPI, orientation
portrait) a partir de ce script Python (bibliotheque mingrammer/diagrams).

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
    "fontsize": "22",
    "fontname": "Helvetica",
    "bgcolor": "white",
    "pad": "0.4",
    "nodesep": "0.55",
    "ranksep": "0.65",
}
NODE_ATTR = {"fontsize": "15", "fontname": "Helvetica"}
EDGE_ATTR = {"fontsize": "12", "fontname": "Helvetica"}

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

    with Cluster("Backend Spring Boot"):
        security = Vault("Sécurité\nJWT + RBAC")
        controller = Spring("Contrôleurs REST\n(29 @RestController)")
        service = Spring("Services métier\n(logique applicative)")
        repository = Server("Repositories\nSpring Data JPA")

        security >> controller >> service >> repository

    with Cluster("Données"):
        db = PostgreSQL("PostgreSQL\n(migrations Flyway)")
        cache = Redis("Redis\n(rate-limit, verrous,\nsessions quiz)")

    with Cluster("Intégrations externes"):
        ia = Blank("APIs IA\n(Gemini / Grok)")
        video = Blank("Bunny Stream\n(vidéo)")
        smtp = Blank("Serveur SMTP\n(email)")

    disk = Storage("Stockage disque\n(data/media)")

    client >> Edge(label="HTTPS / cookie JWT httpOnly") >> security
    repository >> Edge(label="JDBC") >> db
    service >> Edge(label="rate-limit, verrous") >> cache
    service >> Edge(label="génération de questions") >> ia
    service >> Edge(label="upload / streaming") >> video
    service >> Edge(label="campagnes, notifications") >> smtp
    service >> Edge(label="PDF / images") >> disk
