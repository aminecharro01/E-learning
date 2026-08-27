package ma.iatacademy.api.service;

import ma.iatacademy.api.config.BunnyStreamProperties;
import ma.iatacademy.api.config.JwtProperties;
import ma.iatacademy.api.config.MediaProperties;
import ma.iatacademy.api.domain.entity.Asset;
import ma.iatacademy.api.domain.entity.AssetDownload;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.media.SignedStreamResponse;
import ma.iatacademy.api.repository.AssetDownloadRepository;
import ma.iatacademy.api.repository.AssetRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.MediaFolderRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MediaServiceTest {

    @Mock private AssetRepository assetRepository;
    @Mock private MediaFolderRepository mediaFolderRepository;
    @Mock private MediaProperties mediaProperties;
    @Mock private JwtProperties jwtProperties;
    @Mock private BunnyStreamProperties bunnyStreamProperties;
    @Mock private BunnyStreamClient bunnyStreamClient;
    @Mock private AssetDownloadRepository assetDownloadRepository;
    @Mock private UserRepository userRepository;
    @Mock private LessonRepository lessonRepository;
    @Mock private PdfThumbnailBackfillWriter pdfThumbnailBackfillWriter;

    private MediaService mediaService;

    @BeforeEach
    void setUp() {
        mediaService = new MediaService(assetRepository, mediaFolderRepository, mediaProperties,
                jwtProperties, bunnyStreamProperties, bunnyStreamClient, assetDownloadRepository,
                userRepository, lessonRepository, pdfThumbnailBackfillWriter);
        when(mediaProperties.getSigningSecret()).thenReturn("test-signing-secret-of-sufficient-length");
        when(mediaProperties.getSignedUrlTtlSeconds()).thenReturn(3600L);
    }

    @Test
    void recordDownloadAndSignSavesLogRowAndReturnsAttachmentUrl() {
        UUID assetId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        Asset asset = Asset.builder().id(assetId).storagePath("/tmp/x.pdf").assetKind("PDF").build();
        User user = User.builder().id(userId).role(Role.ETUDIANT).build();
        Lesson lesson = Lesson.builder().id(lessonId).build();
        UserPrincipal principal = new UserPrincipal(user);

        when(assetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(lessonRepository.getReferenceById(lessonId)).thenReturn(lesson);

        SignedStreamResponse response = mediaService.recordDownloadAndSign(assetId, principal, lessonId);

        assertTrue(response.url().contains("disposition=attachment"));
        assertTrue(response.url().contains("/api/assets/" + assetId + "/file"));

        ArgumentCaptor<AssetDownload> captor = ArgumentCaptor.forClass(AssetDownload.class);
        verify(assetDownloadRepository).save(captor.capture());
        assertEquals(assetId, captor.getValue().getAsset().getId());
        assertEquals(userId, captor.getValue().getUser().getId());
        assertEquals(lessonId, captor.getValue().getLesson().getId());
    }

    @Test
    void recordDownloadAndSignAllowsNullLessonId() {
        UUID assetId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Asset asset = Asset.builder().id(assetId).storagePath("/tmp/x.pdf").assetKind("PDF").build();
        User user = User.builder().id(userId).role(Role.ETUDIANT).build();
        UserPrincipal principal = new UserPrincipal(user);

        when(assetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(userRepository.getReferenceById(userId)).thenReturn(user);

        mediaService.recordDownloadAndSign(assetId, principal, null);

        ArgumentCaptor<AssetDownload> captor = ArgumentCaptor.forClass(AssetDownload.class);
        verify(assetDownloadRepository).save(captor.capture());
        assertNull(captor.getValue().getLesson());
    }
}
