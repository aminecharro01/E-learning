package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.domain.entity.AnswerOption;
import ma.iatacademy.api.domain.entity.Question;
import ma.iatacademy.api.domain.entity.QuestionBank;
import ma.iatacademy.api.domain.entity.Quiz;
import ma.iatacademy.api.domain.enums.QuestionType;
import ma.iatacademy.api.dto.quiz.QuestionImportResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.QuestionBankRepository;
import ma.iatacademy.api.repository.QuestionRepository;
import ma.iatacademy.api.repository.QuizRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Import Excel des questions à choix (SINGLE_CHOICE/MULTI_CHOICE/TRUE_FALSE) — ESSAY
 * reste créée à la main, un tableur générique pour ce type serait plus confus qu'utile.
 * Colonnes attendues
 * (avec ligne d'en-tête) : Énoncé | Type | Option1 | Correcte1 | Option2 | Correcte2 |
 * Option3 | Correcte3 | Option4 | Correcte4. Même pattern de lecture que
 * GroupImportService (POI déjà en dépendance, pas de tout-ou-rien sur erreur de ligne).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionImportService {

    private static final Set<String> TRUTHY = Set.of("OUI", "VRAI", "X", "1", "TRUE", "YES");

    private final QuestionRepository questionRepository;
    private final QuizRepository quizRepository;
    private final QuestionBankRepository bankRepository;

    @Transactional
    public QuestionImportResponse importIntoQuiz(UUID quizId, MultipartFile file) {
        Quiz quiz = quizRepository.findById(quizId).orElseThrow(() -> new NotFoundException("Quiz introuvable."));
        int nextOrder = questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId).size();
        return importRows(file, nextOrder, q -> {
            q.setQuiz(quiz);
            questionRepository.save(q);
        });
    }

    @Transactional
    public QuestionImportResponse importIntoBank(UUID bankId, MultipartFile file) {
        QuestionBank bank = bankRepository.findById(bankId).orElseThrow(() -> new NotFoundException("Banque introuvable."));
        int nextOrder = questionRepository.findByQuestionBankIdOrderByOrderIndexAsc(bankId).size();
        return importRows(file, nextOrder, q -> {
            q.setQuestionBank(bank);
            questionRepository.save(q);
        });
    }

    private QuestionImportResponse importRows(MultipartFile file, int startOrder, java.util.function.Consumer<Question> attachAndSave) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("Fichier Excel manquant.");
        }
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase(Locale.ROOT) : "";
        if (!filename.endsWith(".xlsx")) {
            throw new ApiException("Le fichier doit être au format .xlsx.");
        }

        List<QuestionImportResponse.RowError> errors = new ArrayList<>();
        int imported = 0;
        int orderIndex = startOrder;

        try (InputStream in = file.getInputStream(); Workbook workbook = new XSSFWorkbook(in)) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();

            for (int r = sheet.getFirstRowNum() + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null || cell(row, 0, formatter).isEmpty()) {
                    continue;
                }
                int humanRow = r + 1;
                String prompt = cell(row, 0, formatter);
                QuestionType type = parseType(cell(row, 1, formatter));
                if (type == null) {
                    errors.add(new QuestionImportResponse.RowError(humanRow,
                            "Type inconnu — attendu SINGLE_CHOICE, MULTI_CHOICE ou TRUE_FALSE."));
                    continue;
                }

                List<AnswerOption> options = new ArrayList<>();
                int correctCount = 0;
                for (int col = 2, idx = 0; col + 1 <= 9; col += 2, idx++) {
                    String label = cell(row, col, formatter);
                    if (label.isEmpty()) continue;
                    boolean correct = TRUTHY.contains(cell(row, col + 1, formatter).toUpperCase(Locale.ROOT));
                    if (correct) correctCount++;
                    options.add(AnswerOption.builder().label(label).correct(correct).orderIndex(idx).build());
                }

                if (options.size() < 2) {
                    errors.add(new QuestionImportResponse.RowError(humanRow, "Au moins 2 options requises."));
                    continue;
                }
                if (type != QuestionType.MULTI_CHOICE && correctCount != 1) {
                    errors.add(new QuestionImportResponse.RowError(humanRow,
                            "Ce type nécessite exactement une bonne réponse (colonne CorrecteN)."));
                    continue;
                }
                if (type == QuestionType.MULTI_CHOICE && correctCount < 1) {
                    errors.add(new QuestionImportResponse.RowError(humanRow, "Au moins une bonne réponse requise."));
                    continue;
                }

                Question question = Question.builder()
                        .prompt(prompt)
                        .questionType(type)
                        .orderIndex(orderIndex++)
                        .build();
                for (AnswerOption o : options) {
                    o.setQuestion(question);
                    question.getOptions().add(o);
                }
                attachAndSave.accept(question);
                imported++;
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Échec de lecture du fichier Excel de questions", e);
            throw new ApiException("Impossible de lire le fichier Excel : " + e.getMessage());
        }

        if (imported == 0 && !errors.isEmpty()) {
            throw new ApiException("Aucune question importée — " + errors.size() + " ligne(s) en erreur : " + errors.get(0).reason());
        }
        return new QuestionImportResponse(imported, errors);
    }

    private QuestionType parseType(String raw) {
        String normalized = raw.trim().toUpperCase(Locale.ROOT).replace(" ", "_");
        return switch (normalized) {
            case "SINGLE_CHOICE", "CHOIX_UNIQUE" -> QuestionType.SINGLE_CHOICE;
            case "MULTI_CHOICE", "CHOIX_MULTIPLE" -> QuestionType.MULTI_CHOICE;
            case "TRUE_FALSE", "VRAI_FAUX" -> QuestionType.TRUE_FALSE;
            default -> null;
        };
    }

    private static String cell(Row row, int index, DataFormatter formatter) {
        Cell cell = row.getCell(index);
        return cell == null ? "" : formatter.formatCellValue(cell).trim();
    }
}
