package ma.iatacademy.api.security;

import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.service.MessagingService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Exercises the REAL Spring Security filter chain (JwtAuthenticationFilter,
 * method-security @PreAuthorize expressions, the SUPER_ADMIN > ADMIN role
 * hierarchy) end-to-end through MockMvc, against the same dev Postgres/Redis
 * this session has used all along (no Testcontainers — see the note in
 * QuizAttemptFlowIntegrationTest's removal: Testcontainers can't reach Docker
 * Desktop's named pipe in this environment). Logs in as the four seeded demo
 * accounts (DataInitializer/DemoDataSeeder) once for the whole class, since
 * each login call counts against RateLimitService's login counter.
 *
 * @Transactional wraps each @Test method (not @BeforeAll) so any row created
 * to set up an ownership scenario is rolled back — nothing here permanently
 * touches the demo data.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SecurityRbacTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private MessagingService messagingService;

    private String etudiantToken;
    private String formateurToken;
    private String adminToken;
    private String superAdminToken;

    @BeforeAll
    void loginAllDemoRoles() throws Exception {
        etudiantToken = login("apprenant@iat-academy.local", "Apprenant@123");
        formateurToken = login("formateur@iat-academy.local", "Formateur@123");
        adminToken = login("admin@iat-academy.local", "Admin@123");
        superAdminToken = login("superadmin@iat-academy.local", "SuperAdmin@123");
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus(), "login failed for " + email + ": " + result.getResponse().getContentAsString());
        Cookie cookie = result.getResponse().getCookie("iat_token");
        assertNotNull(cookie, "no iat_token cookie set for " + email);
        return cookie.getValue();
    }

    @Test
    void anonymousRequestToProtectedEndpointIsRejected() throws Exception {
        mockMvc.perform(get("/api/admin/groups"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status != 401 && status != 403) {
                        throw new AssertionError("expected 401 or 403 for anonymous access, got " + status);
                    }
                });
    }

    @Test
    void tamperedJwtCookieIsRejectedLikeNoCookieAtAll() throws Exception {
        mockMvc.perform(get("/api/admin/groups").cookie(new Cookie("iat_token", "not-a-real-jwt")))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status != 401 && status != 403) {
                        throw new AssertionError("expected 401 or 403 for a tampered token, got " + status);
                    }
                });
    }

    @Test
    void learnerCannotAccessAdminOnlyGroupsController() throws Exception {
        mockMvc.perform(get("/api/admin/groups").cookie(new Cookie("iat_token", etudiantToken)))
                .andExpect(result -> assertEquals(403, result.getResponse().getStatus()));
    }

    @Test
    void formateurIsExcludedFromTheStrictlyAdminOnlyGroupsController() throws Exception {
        // GroupController is @PreAuthorize("hasRole('ADMIN')") at the class level —
        // unlike most staff endpoints it does NOT also allow FORMATEUR, so this
        // pins down the exact boundary of the role hierarchy (it grants SUPER_ADMIN
        // everything ADMIN has, it does not widen ADMIN to include FORMATEUR too).
        mockMvc.perform(get("/api/admin/groups").cookie(new Cookie("iat_token", formateurToken)))
                .andExpect(result -> assertEquals(403, result.getResponse().getStatus()));
    }

    @Test
    void adminCanAccessTheAdminOnlyGroupsController() throws Exception {
        mockMvc.perform(get("/api/admin/groups").cookie(new Cookie("iat_token", adminToken)))
                .andExpect(result -> assertEquals(200, result.getResponse().getStatus()));
    }

    @Test
    void superAdminInheritsAdminAccessThroughTheRoleHierarchy() throws Exception {
        mockMvc.perform(get("/api/admin/groups").cookie(new Cookie("iat_token", superAdminToken)))
                .andExpect(result -> assertEquals(200, result.getResponse().getStatus()));
    }

    @Test
    @Transactional
    void learnerCannotReadAnotherUsersDirectConversation() throws Exception {
        User formateur = userRepository.findByEmailIgnoreCase("formateur@iat-academy.local").orElseThrow();
        User admin = userRepository.findByEmailIgnoreCase("admin@iat-academy.local").orElseThrow();
        UUID conversationId = messagingService.getOrCreateDirect(formateur.getId(), admin.getId());

        // The demo learner is not a participant in this staff-to-staff conversation.
        mockMvc.perform(get("/api/conversations/" + conversationId + "/messages")
                        .cookie(new Cookie("iat_token", etudiantToken)))
                .andExpect(result -> assertEquals(403, result.getResponse().getStatus()));
    }

    @Test
    void unknownConversationIdReturns404NotAnAccessError() throws Exception {
        mockMvc.perform(get("/api/conversations/" + UUID.randomUUID() + "/messages")
                        .cookie(new Cookie("iat_token", etudiantToken)))
                .andExpect(result -> assertEquals(404, result.getResponse().getStatus()));
    }
}
