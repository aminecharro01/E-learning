package ma.iatacademy.api.dto.media;

import ma.iatacademy.api.dto.common.PageResponse;

import java.util.List;

public record MediaBrowseResponse(
        FolderResponse currentFolder,
        List<BreadcrumbEntry> breadcrumbs,
        List<FolderResponse> childFolders,
        PageResponse<AssetResponse> assets
) {
}
