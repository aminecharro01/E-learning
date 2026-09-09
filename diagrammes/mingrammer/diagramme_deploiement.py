# -*- coding: utf-8 -*-
"""Diagramme de déploiement — IAT Academy.

Palette de marque IAT Academy (navy/gold, cohérente avec les diagrammes de
classes UML) : navy pour le routage interne, gold pour les intégrations
externes, bleu-gris pour la couche données. Arêtes en angle droit
(splines="ortho"), clusters à fond teinté, icônes Twemoji (CC BY 4.0,
https://github.com/twitter/twemoji) pour les intégrations externes qui
n'ont pas d'icône de marque dédiée dans mingrammer.

Génère diagrammes/images/diagramme_deploiement.png (300 DPI, orientation
portrait).

Usage : python diagramme_deploiement.py
"""

import os

from diagrams import Cluster, Diagram, Edge
from diagrams.custom import Custom
from diagrams.generic.storage import Storage
from diagrams.onprem.client import Users
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.network import Nginx
from diagrams.programming.framework import Nextjs, Spring

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
    "ranksep": "0.8",
    "splines": "ortho",
}
NODE_ATTR = {"fontsize": "15", "fontname": "Helvetica", "fontcolor": NAVY}
EDGE_ATTR = {"fontsize": "12", "fontname": "Helvetica", "penwidth": "1.6"}

ICONS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")

with Diagram(
    "Diagramme de déploiement - IAT Academy (architecture cible)",
    filename="../images/diagramme_deploiement",
    show=False,
    direction="TB",
    graph_attr=GRAPH_ATTR,
    node_attr=NODE_ATTR,
    edge_attr=EDGE_ATTR,
    outformat="png",
):
    user = Users("Utilisateur")

    with Cluster(
        "Docker Compose (postgres + redis actifs aujourd'hui — api/frontend/nginx cibles)",
        graph_attr={"bgcolor": "#EAF2FB", "pencolor": NAVY, "fontcolor": NAVY},
    ):
        proxy = Nginx("nginx\n(reverse proxy :80)")
        frontend = Nextjs("frontend\n(Next.js :3000)")
        api = Spring("api\n(Spring Boot :8080)")
        db = PostgreSQL("postgres\n(PostgreSQL 16)")
        cache = Redis("redis\n(Redis 7)")

        proxy >> Edge(color=NAVY, style="bold", label="/ (+ WebSocket)") >> frontend
        proxy >> Edge(color=NAVY, style="bold", label="/api/, /swagger-ui/") >> api
        api >> Edge(color=NAVY_MUTED, style="bold", label="JDBC (Flyway)") >> db
        api >> Edge(color=NAVY_MUTED, style="dashed", label="rate-limit, sessions") >> cache

    media = Storage("Volume\ndata/media")

    with Cluster(
        "Services externes",
        graph_attr={"bgcolor": "#FFF8EC", "pencolor": GOLD, "fontcolor": NAVY},
    ):
        llm = Custom("APIs IA\n(Gemini / Grok)", f"{ICONS}/ai.png")
        video = Custom("Bunny Stream\n(vidéo)", f"{ICONS}/video.png")
        smtp = Custom("Serveur SMTP\n(email)", f"{ICONS}/email.png")

    user >> Edge(color=NAVY, style="bold", label="HTTPS") >> proxy
    api >> Edge(color=NAVY_MUTED, style="dotted", label="PDF / images") >> media
    api >> Edge(color=GOLD, style="dashed", label="génération IA") >> llm
    api >> Edge(color=GOLD, style="dashed", label="streaming vidéo") >> video
    api >> Edge(color=GOLD, style="dashed", label="notifications, campagnes") >> smtp
