package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.LessonComment;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.BadgeCode;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.comment.CreateCommentRequest;
import ma.iatacademy.api.dto.comment.LessonCommentResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.repository.LessonCommentRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private LessonCommentRepository commentRepository;
    @Mock
    private LessonRepository lessonRepository;
    @Mock
    private ModuleRepository moduleRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProgressionService progressionService;
    @Mock
    private BadgeService badgeService;

    @InjectMocks
    private CommentService commentService;

    @Test
    void replyToAReplyIsRejected() {
        UUID lessonId = UUID.randomUUID();
        UUID parentId = UUID.randomUUID();
        UUID grandparentId = UUID.randomUUID();
        Lesson lesson = Lesson.builder().id(lessonId).module(ModuleEntity.builder().id(UUID.randomUUID()).build()).build();
        LessonComment grandparent = LessonComment.builder().id(grandparentId).build();
        LessonComment parent = LessonComment.builder().id(parentId).parent(grandparent).build();
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(commentRepository.findById(parentId)).thenReturn(Optional.of(parent));

        User student = User.builder().id(UUID.randomUUID()).role(Role.ETUDIANT).build();
        UserPrincipal principal = new UserPrincipal(student);
        CreateCommentRequest request = new CreateCommentRequest("reply to a reply", parentId);

        assertThrows(ApiException.class, () -> commentService.createOnLesson(lessonId, request, principal));
        verify(commentRepository, never()).save(any());
    }

    @Test
    void createOnLessonAwardsForumBadgeForLearner() {
        UUID lessonId = UUID.randomUUID();
        Lesson lesson = Lesson.builder().id(lessonId).module(ModuleEntity.builder().id(UUID.randomUUID()).build()).build();
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        User student = User.builder().id(UUID.randomUUID()).role(Role.ETUDIANT).fullName("Student").build();
        when(userRepository.getReferenceById(student.getId())).thenReturn(student);
        when(commentRepository.save(any())).thenAnswer(inv -> {
            LessonComment c = inv.getArgument(0);
            c.setAuthor(student);
            c.setCreatedAt(Instant.now());
            return c;
        });

        UserPrincipal principal = new UserPrincipal(student);
        CreateCommentRequest request = new CreateCommentRequest("hello world", null);

        commentService.createOnLesson(lessonId, request, principal);

        verify(badgeService, times(1)).awardIfAbsent(student, BadgeCode.FORUM_CONTRIBUTOR);
    }

    @Test
    void createOnLessonDoesNotAwardBadgeForStaff() {
        UUID lessonId = UUID.randomUUID();
        Lesson lesson = Lesson.builder().id(lessonId).module(ModuleEntity.builder().id(UUID.randomUUID()).build()).build();
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        User formateur = User.builder().id(UUID.randomUUID()).role(Role.FORMATEUR).fullName("Prof").build();
        when(userRepository.getReferenceById(formateur.getId())).thenReturn(formateur);
        when(commentRepository.save(any())).thenAnswer(inv -> {
            LessonComment c = inv.getArgument(0);
            c.setAuthor(formateur);
            c.setCreatedAt(Instant.now());
            return c;
        });

        UserPrincipal principal = new UserPrincipal(formateur);
        commentService.createOnLesson(lessonId, new CreateCommentRequest("hello", null), principal);

        verify(badgeService, never()).awardIfAbsent(any(), any());
    }

    @Test
    void listByLessonHidesHiddenCommentsFromLearners() {
        UUID lessonId = UUID.randomUUID();
        Lesson lesson = Lesson.builder().id(lessonId).module(ModuleEntity.builder().id(UUID.randomUUID()).build()).build();
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        User author = User.builder().id(UUID.randomUUID()).role(Role.ETUDIANT).fullName("Author").build();
        LessonComment visible = LessonComment.builder().id(UUID.randomUUID()).author(author)
                .body("visible").hidden(false).build();
        visible.setCreatedAt(Instant.now());
        LessonComment hidden = LessonComment.builder().id(UUID.randomUUID()).author(author)
                .body("hidden").hidden(true).build();
        hidden.setCreatedAt(Instant.now());
        when(commentRepository.findByLessonIdOrderByCreatedAtAsc(lessonId)).thenReturn(List.of(visible, hidden));

        User student = User.builder().id(UUID.randomUUID()).role(Role.ETUDIANT).build();
        List<LessonCommentResponse> result = commentService.listByLesson(lessonId, new UserPrincipal(student));

        assertEquals(1, result.size());
        assertEquals("visible", result.get(0).body());
    }

    @Test
    void listByLessonShowsHiddenCommentsToStaff() {
        UUID lessonId = UUID.randomUUID();
        Lesson lesson = Lesson.builder().id(lessonId).module(ModuleEntity.builder().id(UUID.randomUUID()).build()).build();
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        User author = User.builder().id(UUID.randomUUID()).role(Role.ETUDIANT).fullName("Author").build();
        LessonComment hidden = LessonComment.builder().id(UUID.randomUUID()).author(author)
                .body("hidden").hidden(true).build();
        hidden.setCreatedAt(Instant.now());
        when(commentRepository.findByLessonIdOrderByCreatedAtAsc(lessonId)).thenReturn(List.of(hidden));

        User admin = User.builder().id(UUID.randomUUID()).role(Role.ADMIN).build();
        List<LessonCommentResponse> result = commentService.listByLesson(lessonId, new UserPrincipal(admin));

        assertTrue(result.size() == 1);
    }
}
