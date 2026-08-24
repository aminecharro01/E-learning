package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.LessonNote;
import ma.iatacademy.api.dto.note.LessonNoteResponse;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.LessonNoteRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Carnet de notes personnelles par leçon — jamais visible par un autre utilisateur,
 * y compris le staff : chaque lecture/écriture est scopée au user_id de l'appelant,
 * pas seulement filtrée côté affichage.
 */
@Service
@RequiredArgsConstructor
public class LessonNoteService {

    private final LessonNoteRepository noteRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<LessonNoteResponse> listMine(UUID lessonId, UUID userId) {
        return noteRepository.findByUserIdAndLessonIdOrderByCreatedAtDesc(userId, lessonId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public LessonNoteResponse create(UUID lessonId, UUID userId, String body) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new NotFoundException("Leçon introuvable."));
        LessonNote note = LessonNote.builder()
                .user(userRepository.getReferenceById(userId))
                .lesson(lesson)
                .body(body.trim())
                .build();
        noteRepository.save(note);
        return toResponse(note);
    }

    @Transactional
    public LessonNoteResponse update(UUID noteId, UUID userId, String body) {
        LessonNote note = requireOwnNote(noteId, userId);
        note.setBody(body.trim());
        return toResponse(note);
    }

    @Transactional
    public void delete(UUID noteId, UUID userId) {
        noteRepository.delete(requireOwnNote(noteId, userId));
    }

    private LessonNote requireOwnNote(UUID noteId, UUID userId) {
        LessonNote note = noteRepository.findById(noteId)
                .orElseThrow(() -> new NotFoundException("Note introuvable."));
        if (!note.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Cette note ne vous appartient pas.");
        }
        return note;
    }

    private LessonNoteResponse toResponse(LessonNote n) {
        return new LessonNoteResponse(n.getId(), n.getBody(), n.getCreatedAt(), n.getUpdatedAt());
    }
}
