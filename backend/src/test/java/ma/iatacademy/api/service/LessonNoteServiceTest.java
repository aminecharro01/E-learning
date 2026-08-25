package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.LessonNote;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.dto.note.LessonNoteResponse;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.LessonNoteRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LessonNoteServiceTest {

    @Mock
    private LessonNoteRepository noteRepository;
    @Mock
    private LessonRepository lessonRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private LessonNoteService lessonNoteService;

    @Test
    void createThrowsWhenLessonMissing() {
        UUID lessonId = UUID.randomUUID();
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class,
                () -> lessonNoteService.create(lessonId, UUID.randomUUID(), "note body"));
    }

    @Test
    void createTrimsBodyAndSaves() {
        UUID lessonId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(Lesson.builder().id(lessonId).build()));
        when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());

        LessonNoteResponse response = lessonNoteService.create(lessonId, userId, "  hello  ");

        assertEquals("hello", response.body());
        verify(noteRepository, times(1)).save(org.mockito.ArgumentMatchers.any(LessonNote.class));
    }

    @Test
    void updateRejectsWhenNoteBelongsToAnotherUser() {
        UUID noteId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        LessonNote note = LessonNote.builder().id(noteId).user(User.builder().id(ownerId).build()).build();
        when(noteRepository.findById(noteId)).thenReturn(Optional.of(note));

        assertThrows(ForbiddenException.class, () -> lessonNoteService.update(noteId, otherId, "new body"));
    }

    @Test
    void deleteRejectsWhenNoteBelongsToAnotherUser() {
        UUID noteId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        LessonNote note = LessonNote.builder().id(noteId).user(User.builder().id(ownerId).build()).build();
        when(noteRepository.findById(noteId)).thenReturn(Optional.of(note));

        assertThrows(ForbiddenException.class, () -> lessonNoteService.delete(noteId, otherId));
    }

    @Test
    void updateSucceedsForOwner() {
        UUID noteId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        LessonNote note = LessonNote.builder().id(noteId).user(User.builder().id(ownerId).build()).build();
        when(noteRepository.findById(noteId)).thenReturn(Optional.of(note));

        LessonNoteResponse response = lessonNoteService.update(noteId, ownerId, "  updated  ");

        assertEquals("updated", response.body());
    }
}
