"""
Validador personalizado de contraseñas para HemoVida.
Replica con exactitud la política de seguridad definida en el Trigger T1 de la base de datos PostgreSQL:
- Longitud mínima de 8 caracteres.
- Al menos 1 letra mayúscula (A-Z).
- Al menos 1 letra minúscula (a-z).
- Al menos 1 número (0-9).
- Al menos 1 carácter especial (!@#$%^&*()_+-=[]{};':"|,.<>/?`~).
"""
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

# Expresión regular idéntica a la del trigger fn_trg_validar_password_seguro()
PASSWORD_REGEX = re.compile(
    r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?`~]).{8,}$'
)

def validate_password_complexity(password: str) -> None:
    """
    Función utilitaria para validar la complejidad de la contraseña.
    Lanza ValidationError si no cumple los requisitos.
    """
    if not password:
        raise ValidationError(
            _("La contraseña no puede estar vacía."),
            code='password_empty'
        )
    
    if len(password) < 8:
        raise ValidationError(
            _("La contraseña debe tener una longitud mínima de 8 caracteres."),
            code='password_too_short'
        )
        
    if not re.search(r'[A-Z]', password):
        raise ValidationError(
            _("La contraseña debe contener al menos una letra mayúscula (A-Z)."),
            code='password_no_upper'
        )

    if not re.search(r'[a-z]', password):
        raise ValidationError(
            _("La contraseña debe contener al menos una letra minúscula (a-z)."),
            code='password_no_lower'
        )

    if not re.search(r'\d', password):
        raise ValidationError(
            _("La contraseña debe contener al menos un número (0-9)."),
            code='password_no_digit'
        )

    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?`~]', password):
        raise ValidationError(
            _("La contraseña debe contener al menos un carácter especial (!@#$%^&*()_+-=[]{};':\"|,.<>/?`~)."),
            code='password_no_special'
        )

    if not PASSWORD_REGEX.match(password):
        raise ValidationError(
            _("La contraseña no cumple la política de seguridad: Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial."),
            code='password_complexity_failed'
        )

class SecurePasswordValidator:
    """
    Clase validadora compatible con AUTH_PASSWORD_VALIDATORS de Django.
    """
    def validate(self, password, user=None):
        validate_password_complexity(password)

    def get_help_text(self):
        return _(
            "Su contraseña debe contener al menos 8 caracteres, incluyendo al menos "
            "una letra mayúscula, una letra minúscula, un dígito y un carácter especial."
        )
