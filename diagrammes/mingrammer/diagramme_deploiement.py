# -*- coding: utf-8 -*-
"""Diagramme de déploiement — IAT Academy.

Génère diagrammes/images/diagramme_deploiement.png (300 DPI, orientation
portrait) à partir de ce script Python (bibliothèque mingrammer/diagrams).

Usage : python diagramme_deploiement.py
"""

from diagrams import Cluster, Diagram, Edge
from diagrams.generic.blank import Blank
from diagrams.generic.storage import Storage
from diagrams.onprem.client import Users
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.network import Nginx
from diagrams.programming.framework import Nextjs, Spring

GRAPH_ATTR = {
    "dpi": "300",
    "fontsize": "22",
    "fontname": "Helvetica",
    "bgcolor": "white",
    "pad": "0.4",
    "nodesep": "0.55",
    "ranksep": "0.7",
}
NODE_ATTR = {"fontsize": "15", "fontname": "Helvetica"}
EDGE_ATTR = {"fontsize": "12", "fontname": "Helvetica"}

with Diagram(
    "Diagramme de déploiement - IAT Academy",
    filename="../images/diagramme_deploiement",
    show=False,
    direction="TB",
    graph_attr=GRAPH_ATTR,
    node_attr=NODE_ATTR,
    edge_attr=EDGE_ATTR,
    outformat="png",
):
    user = Users("Utilisateur")

    with Cluster("Docker Compose"):
        proxy = Nginx("nginx\n(reverse proxy :80)")
        frontend = Nextjs("frontend\n(Next.js :3000)")
        api = Spring("api\n(Spring Boot :8080)")
        db = PostgreSQL("postgres\n(PostgreSQL 16)")
        cache = Redis("redis\n(Redis 7)")

    media = Storage("Volume\ndata/media")

    with Cluster("Services externes"):
        llm = Blank("APIs IA\n(Gemini / Grok)")
        other = Blank("Bunny Stream\n+ SMTP")

    user >> Edge(label="HTTPS") >> proxy
    proxy >> Edge(label="/ (+ WebSocket)") >> frontend
    proxy >> Edge(label="/api/, /swagger-ui/") >> api
    api >> Edge(label="JDBC (Flyway)") >> db
    api >> Edge(label="rate-limit, sessions") >> cache
    api >> Edge(label="PDF / images") >> media
    api >> Edge(label="génération IA") >> llm
    api >> Edge(label="vidéo, email") >> other
