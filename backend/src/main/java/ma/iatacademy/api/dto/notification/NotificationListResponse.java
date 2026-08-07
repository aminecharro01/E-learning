package ma.iatacademy.api.dto.notification;

import ma.iatacademy.api.dto.common.PageResponse;

public record NotificationListResponse(
        PageResponse<NotificationResponse> page,
        long unreadCount
) {
}
