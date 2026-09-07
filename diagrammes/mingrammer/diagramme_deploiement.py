# -*- coding: utf-8 -*-
"""Diagramme de déploiement — IAT Academy.

Style inspiré de l'exemple officiel mingrammer "Advanced Web Service with
On-Premises" : arêtes colorées et étiquetées par type de flux, clusters à
fond teinté, imbrication limitée à un seul niveau.

Génère diagrammes/images/diagramme_deploiement.png (300 DPI, orientation
portrait).

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
    "fontsize": "24",
    "fontname": "Helvetica-Bold",
    "bgcolor": "white",
    "pad": "0.4",
    "nodesep": "0.6",
    "ranksep": "0.8",
    "splines": "spline",
}
NODE_ATTR = {"fontsize": "15", "fontname": "Helvetica"}
EDGE_ATTR = {"fontsize": "12", "fontname": "Helvetica", "penwidth": "1.6"}

# Palette par type de flux (cohérente avec le diagramme d'architecture)
COLOR_HTTP = "darkgreen"
COLOR_ROUTE = "black"
COLOR_DB = "steelblue"
COLOR_CACHE = "firebrick"
COLOR_DISK = "saddlebrown"
COLOR_IA = "darkorange"
COLOR_OTHER = "mediumvioletred"

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

    with Cluster("Docker Compose", graph_attr={"bgcolor": "#EAF2FB"}):
        proxy = Nginx("nginx\n(reverse proxy :80)")
        frontend = Nextjs("frontend\n(Next.js :3000)")
        api = Spring("api\n(Spring Boot :8080)")
        db = PostgreSQL("postgres\n(PostgreSQL 16)")
        cache = Redis("redis\n(Redis 7)")

        proxy >> Edge(color=COLOR_ROUTE, style="bold", label="/ (+ WebSocket)") >> frontend
        proxy >> Edge(color=COLOR_ROUTE, style="bold", label="/api/, /swagger-ui/") >> api
        api >> Edge(color=COLOR_DB, style="bold", label="JDBC (Flyway)") >> db
        api >> Edge(color=COLOR_CACHE, style="dashed", label="rate-limit, sessions") >> cache

    media = Storage("Volume\ndata/media")

    with Cluster("Services externes", graph_attr={"bgcolor": "#FDF0E3"}):
        llm = Blank("APIs IA\n(Gemini / Grok)")
        other = Blank("Bunny Stream\n+ SMTP")

    user >> Edge(color=COLOR_HTTP, style="bold", label="HTTPS") >> proxy
    api >> Edge(color=COLOR_DISK, style="dotted", label="PDF / images") >> media
    api >> Edge(color=COLOR_IA, style="dashed", label="génération IA") >> llm
    api >> Edge(color=COLOR_OTHER, style="dashed", label="vidéo, email") >> other
