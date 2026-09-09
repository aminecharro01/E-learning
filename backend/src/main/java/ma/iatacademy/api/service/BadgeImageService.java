package ma.iatacademy.api.service;

import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.domain.entity.UserBadge;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Compose l'image "carte d'embarquement" utilisée comme aperçu LinkedIn (og:image) pour
 * une réussite partagée — reprend en Java2D les couleurs et le motif déjà utilisés côté
 * frontend pour le tableau de bord apprenant (.iat-board .boarding-pass, boarding.css) :
 * fond navy, bandeau dégradé or ("--wing"), pointillés de séparation, souche à droite.
 * Générée une fois à l'obtention du badge puis servie telle quelle (voir BadgeService).
 */
@Slf4j
@Service
public class BadgeImageService {

    private static final int WIDTH = 1200;
    private static final int HEIGHT = 630; // format standard d'aperçu Open Graph

    private static final Color NAVY = new Color(0x14, 0x2B, 0x4B);
    private static final Color NAVY_DEEP = new Color(0x0B, 0x1A, 0x30);
    private static final Color GOLD_300 = new Color(0xFF, 0xD9, 0x8A);
    private static final Color GOLD_500 = new Color(0xF5, 0xA6, 0x23);
    private static final Color GOLD_700 = new Color(0xC9, 0x76, 0x12);
    private static final Color CREAM = new Color(0xF7, 0xF0, 0xDD);
    private static final Color CREAM_DIM = new Color(0xCD, 0xBF, 0x9E);

    @Value("${app.media.root-path:../data/media}")
    private String mediaRoot;

    /** Sert un cache disque paresseux, comme MediaService#renderPdfThumbnail : générée une
     *  seule fois (la donnée d'un badge déjà obtenu est figée), puis relue telle quelle. */
    public Path getOrGenerateImage(UserBadge userBadge, String learnerName) {
        Path path = Path.of(mediaRoot, "badges", userBadge.getShareCode() + ".png");
        if (Files.exists(path)) {
            return path;
        }
        try {
            Files.createDirectories(path.getParent());
            BufferedImage image = draw(userBadge, learnerName);
            ImageIO.write(image, "png", path.toFile());
        } catch (IOException e) {
            log.error("Failed to generate badge image", e);
            throw new IllegalStateException("Impossible de générer l'image du badge.");
        }
        return path;
    }

    private BufferedImage draw(UserBadge userBadge, String learnerName) {
        var image = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

        // Fond dégradé navy (haut clair -> bas profond), comme .boarding-pass
        g.setPaint(new GradientPaint(0, 0, NAVY, 0, HEIGHT, NAVY_DEEP));
        g.fillRect(0, 0, WIDTH, HEIGHT);

        int margin = 64;
        int stubWidth = 320;
        int mainWidth = WIDTH - margin * 2 - stubWidth - 32;

        // --- Souche à droite (barcode + icône) ---
        int stubX = WIDTH - margin - stubWidth;
        drawDashedLine(g, stubX - 16, margin, stubX - 16, HEIGHT - margin, CREAM_DIM);

        Paint wing = new GradientPaint(stubX, 0, GOLD_300, stubX + stubWidth, 0, GOLD_700);
        g.setPaint(wing);
        RoundRectangle2D iconBox = new RoundRectangle2D.Float(stubX + stubWidth / 2f - 55, 130, 110, 110, 26, 26);
        g.fill(iconBox);
        g.setColor(NAVY_DEEP);
        g.setStroke(new BasicStroke(5f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        drawGlyph(g, userBadge, stubX + stubWidth / 2, 185);

        g.setColor(CREAM);
        g.setFont(new Font("SansSerif", Font.BOLD, 22));
        drawCentered(g, "IAT ACADEMY", stubX + stubWidth / 2, 300);
        g.setColor(CREAM_DIM);
        g.setFont(new Font("Monospaced", Font.PLAIN, 18));
        drawCentered(g, userBadge.getShareCode(), stubX + stubWidth / 2, 335);

        // Barres façon code-barres
        g.setColor(GOLD_300);
        int barY = 400;
        int barX = stubX + 20;
        java.util.Random rnd = new java.util.Random(userBadge.getShareCode().hashCode());
        while (barX < stubX + stubWidth - 20) {
            int w = 2 + rnd.nextInt(4);
            g.fillRect(barX, barY, w, 60);
            barX += w + 3 + rnd.nextInt(6);
        }

        // --- Corps principal ---
        int textX = margin;
        g.setColor(GOLD_300);
        g.setFont(new Font("Monospaced", Font.BOLD, 22));
        g.drawString("RÉUSSITE VÉRIFIÉE", textX, margin + 40);

        g.setColor(CREAM);
        g.setFont(new Font("SansSerif", Font.BOLD, 52));
        drawWrapped(g, userBadge.getBadgeCode().getLabel(), textX, margin + 120, mainWidth);

        g.setColor(CREAM_DIM);
        g.setFont(new Font("SansSerif", Font.PLAIN, 28));
        g.drawString(learnerName, textX, margin + 175);

        drawDashedLine(g, textX, HEIGHT - 170, textX + mainWidth, HEIGHT - 170, CREAM_DIM);

        g.setColor(GOLD_300);
        g.setFont(new Font("Monospaced", Font.BOLD, 16));
        g.drawString("DATE", textX, HEIGHT - 130);
        g.drawString("CODE", textX + 260, HEIGHT - 130);

        g.setColor(CREAM);
        g.setFont(new Font("SansSerif", Font.BOLD, 22));
        String date = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.FRENCH)
                .withZone(ZoneOffset.UTC)
                .format(userBadge.getAwardedAt());
        g.drawString(date, textX, HEIGHT - 100);
        g.drawString(userBadge.getShareCode(), textX + 260, HEIGHT - 100);

        g.dispose();
        return image;
    }

    /** Silhouette simple selon le badge — mêmes formes que les icônes SVG du frontend (IatIcons.tsx), en trait. */
    private void drawGlyph(Graphics2D g, UserBadge userBadge, int cx, int cy) {
        g.setColor(NAVY_DEEP);
        g.setStroke(new BasicStroke(6f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        switch (userBadge.getBadgeCode()) {
            case STAGE_VALIDATED -> {
                g.drawRoundRect(cx - 30, cy - 15, 60, 45, 8, 8);
                g.drawLine(cx - 30, cy, cx + 30, cy);
            }
            case YEAR1_VALIDATED -> {
                g.setFont(new Font("SansSerif", Font.BOLD, 46));
                drawCentered(g, "1", cx, cy + 15);
            }
            case YEAR2_VALIDATED -> {
                g.setFont(new Font("SansSerif", Font.BOLD, 46));
                drawCentered(g, "2", cx, cy + 15);
            }
            default -> {
                g.drawOval(cx - 25, cy - 32, 50, 50);
                g.drawLine(cx - 16, cy + 30, cx - 22, cy + 55);
                g.drawLine(cx + 16, cy + 30, cx + 22, cy + 55);
            }
        }
    }

    private void drawCentered(Graphics2D g, String text, int centerX, int y) {
        FontMetrics fm = g.getFontMetrics();
        int w = fm.stringWidth(text);
        g.drawString(text, centerX - w / 2, y);
    }

    private void drawWrapped(Graphics2D g, String text, int x, int y, int maxWidth) {
        FontMetrics fm = g.getFontMetrics();
        if (fm.stringWidth(text) <= maxWidth) {
            g.drawString(text, x, y);
            return;
        }
        String[] words = text.split(" ");
        StringBuilder line = new StringBuilder();
        int lineY = y;
        for (String word : words) {
            String candidate = line.isEmpty() ? word : line + " " + word;
            if (fm.stringWidth(candidate) > maxWidth && !line.isEmpty()) {
                g.drawString(line.toString(), x, lineY);
                line = new StringBuilder(word);
                lineY += fm.getHeight();
            } else {
                line = new StringBuilder(candidate);
            }
        }
        if (!line.isEmpty()) {
            g.drawString(line.toString(), x, lineY);
        }
    }

    private void drawDashedLine(Graphics2D g, int x1, int y1, int x2, int y2, Color color) {
        Stroke original = g.getStroke();
        g.setColor(color);
        g.setStroke(new BasicStroke(2f, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 10f, new float[]{6f, 6f}, 0f));
        g.drawLine(x1, y1, x2, y2);
        g.setStroke(original);
    }
}
