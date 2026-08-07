package ma.iatacademy.api.security;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Résout l'identifiant de connexion par email, puis par matricule/CIN en repli.
     * C'est tout ce qu'il faut pour que les comptes importés (dont l'email n'est
     * qu'un placeholder tant que le profil n'est pas complété) se connectent via le
     * endpoint /api/auth/login existant, sans route ni flux d'authentification séparé.
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByEmailIgnoreCase(username)
                .or(() -> userRepository.findByMatriculeIgnoreCase(username.trim()))
                .map(UserPrincipal::new)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }
}
