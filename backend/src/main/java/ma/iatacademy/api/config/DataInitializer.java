package ma.iatacademy.api.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.PaymentStatus;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.Year;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        if (!userRepository.existsByEmailIgnoreCase("admin@iat-academy.local")) {
            User admin = User.builder()
                    .email("admin@iat-academy.local")
                    .passwordHash(passwordEncoder.encode("Admin@123"))
                    .fullName("Administrateur IAT")
                    .role(Role.ADMIN)
                    .enabled(true)
                    .paymentStatus(PaymentStatus.EXEMPTED)
                    .activatedAt(Instant.now())
                    .build();
            userRepository.save(admin);
            log.warn("Default admin created: admin@iat-academy.local / Admin@123 — CHANGE THIS PASSWORD IN PRODUCTION");
        }

        if (!userRepository.existsByEmailIgnoreCase("apprenant@iat-academy.local")) {
            User learner = User.builder()
                    .email("apprenant@iat-academy.local")
                    .passwordHash(passwordEncoder.encode("Apprenant@123"))
                    .fullName("Apprenant Demo")
                    .role(Role.ETUDIANT)
                    .enabled(true)
                    .paymentStatus(PaymentStatus.PAID)
                    .enrollmentYear(Year.now().getValue())
                    .activatedAt(Instant.now())
                    .build();
            userRepository.save(learner);
            log.warn("Default learner created: apprenant@iat-academy.local / Apprenant@123");
        }
    }
}
