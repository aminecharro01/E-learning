package ma.iatacademy.api.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.PaymentStatus;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.Year;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        User admin = userRepository.findByEmailIgnoreCase("admin@iat-academy.local").orElse(null);
        if (admin == null) {
            admin = User.builder()
                    .email("admin@iat-academy.local")
                    .passwordHash(passwordEncoder.encode("Admin@123"))
                    .role(Role.ADMIN)
                    .build();
            log.warn("Default admin created: admin@iat-academy.local / Admin@123 — CHANGE THIS PASSWORD IN PRODUCTION");
        }
        admin.setFullName("Administrateur IAT");
        admin.setEnabled(true);
        admin.setPaymentStatus(PaymentStatus.EXEMPTED);
        admin.setActivatedAt(Instant.now());
        userRepository.save(admin);

        User superAdmin = userRepository.findByEmailIgnoreCase("superadmin@iat-academy.local").orElse(null);
        if (superAdmin == null) {
            superAdmin = User.builder()
                    .email("superadmin@iat-academy.local")
                    .passwordHash(passwordEncoder.encode("SuperAdmin@123"))
                    .role(Role.SUPER_ADMIN)
                    .build();
            log.warn("Default super admin created: superadmin@iat-academy.local / SuperAdmin@123 — CHANGE THIS PASSWORD IN PRODUCTION");
        }
        superAdmin.setFullName("Super Admin");
        superAdmin.setEnabled(true);
        superAdmin.setPaymentStatus(PaymentStatus.EXEMPTED);
        superAdmin.setActivatedAt(Instant.now());
        userRepository.save(superAdmin);

        if (!userRepository.existsByEmailIgnoreCase("apprenant@iat-academy.local")) {
            User learner = User.builder()
                    .email("apprenant@iat-academy.local")
                    .passwordHash(passwordEncoder.encode("Apprenant@123"))
                    .fullName("Nora El Amrani")
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
