package ma.iatacademy.api.dto.admin;

public record AdminStatsResponse(
        long activeLearners,
        double averageSuccessRate,
        long certificatesIssued,
        long modulesCount,
        long publishedLessons,
        long quizAttemptsTotal,
        long newContactMessages,
        long newsletterSubscribers
) {
}
