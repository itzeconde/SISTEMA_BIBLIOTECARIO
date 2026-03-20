from django.db import models
from datetime import date, timedelta
import uuid

# ─────────────────────────────────────────
# Constantes globales
# ─────────────────────────────────────────
DIAS_ESPERA_APARTADO = 5
DIAS_RECOGIDA        = 3
DIAS_PRESTAMO_OPTS   = [3, 5, 7]


def calcular_fecha_limite_habiles(desde: date, dias: int) -> date:
    festivos = set(DiaFestivo.objects.values_list('fecha', flat=True))
    fecha = desde
    contados = 0
    while contados < dias:
        fecha += timedelta(days=1)
        if fecha.weekday() < 5 and fecha not in festivos:
            contados += 1
    return fecha


class DiaFestivo(models.Model):
    fecha       = models.DateField(unique=True)
    descripcion = models.CharField(max_length=100)

    class Meta:
        db_table = 'dias_festivos'

    def __str__(self):
        return f"{self.fecha} — {self.descripcion}"


class Usuario(models.Model):
    ROL_CHOICES = [
        ('usuario', 'Usuario'),
        ('admin',   'Admin'),
    ]
    usuario_id              = models.AutoField(primary_key=True)
    matricula_id            = models.CharField(max_length=20, unique=True)
    usuario_nombre          = models.CharField(max_length=100)
    usuario_aPaterno        = models.CharField(max_length=100)
    usuario_aMaterno        = models.CharField(max_length=100, blank=True, default='')
    usuario_password        = models.CharField(max_length=255)
    usuario_email          = models.EmailField(max_length=255, blank=True, null=True)
    usuario_rol             = models.CharField(max_length=20, choices=ROL_CHOICES, default='usuario')
    usuario_bloqueado_hasta = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'usuarios'


class PasswordResetToken(models.Model):
    """Token de un solo uso para restablecer contraseña vía correo."""
    usuario    = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    token      = models.UUIDField(default=uuid.uuid4, unique=True)
    creado_en  = models.DateTimeField(auto_now_add=True)
    usado      = models.BooleanField(default=False)

    class Meta:
        db_table = 'password_reset_tokens'

    def esta_vigente(self):
        from django.utils import timezone
        return not self.usado and (timezone.now() - self.creado_en).total_seconds() < 3600  # 1 hora


class Editorial(models.Model):
    editorial_id     = models.AutoField(primary_key=True)
    editorial_nombre = models.CharField(max_length=200)

    class Meta:
        db_table = 'editoriales'


class Categoria(models.Model):
    categoria_id     = models.AutoField(primary_key=True)
    categoria_nombre = models.CharField(max_length=100)

    class Meta:
        db_table = 'categorias'


class Libro(models.Model):
    libro_id          = models.AutoField(primary_key=True)
    libro_titulo      = models.CharField(max_length=300)
    libro_autor       = models.CharField(max_length=200)
    libro_isbn        = models.CharField(max_length=20, unique=True)
    libro_ejemplares  = models.IntegerField(default=1)
    libro_descripcion = models.TextField(blank=True, default='')
    editorial         = models.ForeignKey(Editorial, on_delete=models.SET_NULL, null=True, db_column='editorial_id')
    categoria         = models.ForeignKey(Categoria, on_delete=models.SET_NULL, null=True, db_column='categoria_id')

    class Meta:
        db_table = 'libros'


class Prestamo(models.Model):
    ESTATUS_CHOICES = [
        ('Pendiente',  'Pendiente de entrega'),
        ('Activo',     'Activo'),
        ('Devuelto',   'Devuelto'),
        ('Vencido',    'Vencido'),
        ('Cancelado',  'Cancelado por usuario'),
    ]
    prestamo_id                     = models.AutoField(primary_key=True)
    usuario                         = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='usuario_id')
    libro                           = models.ForeignKey(Libro, on_delete=models.CASCADE, db_column='libro_id')
    prestamo_fecha_salida           = models.DateField()
    prestamo_fecha_entrega_esperada = models.DateField()
    prestamo_fecha_devolucion_real  = models.DateField(null=True, blank=True)
    prestamo_estatus                = models.CharField(max_length=20, choices=ESTATUS_CHOICES, default='Pendiente')
    prestamo_dias_plazo             = models.IntegerField(null=True, blank=True)
    prestamo_entregado_admin        = models.BooleanField(default=False)
    prestamo_fecha_entrega_real     = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'prestamos'

    def marcar_entregado_por_admin(self):
        hoy = date.today()
        self.prestamo_entregado_admin    = True
        self.prestamo_fecha_entrega_real = hoy
        self.prestamo_fecha_entrega_esperada = calcular_fecha_limite_habiles(
            hoy, self.prestamo_dias_plazo
        )
        self.prestamo_estatus = 'Activo'
        self.save()


class Apartado(models.Model):
    ESTATUS_CHOICES = [
        ('Pendiente',  'Pendiente'),
        ('Asignado',   'Asignado'),
        ('Cancelado',  'Cancelado'),
        ('Convertido', 'Convertido'),
    ]
    apartado_id                    = models.AutoField(primary_key=True)
    usuario                        = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='usuario_id')
    libro                          = models.ForeignKey(Libro, on_delete=models.CASCADE, db_column='libro_id')
    apartado_fecha                 = models.DateField()
    apartado_fecha_expiracion      = models.DateField()
    apartado_fecha_asignacion      = models.DateField(null=True, blank=True)
    apartado_fecha_limite_recogida = models.DateField(null=True, blank=True)
    apartado_estatus               = models.CharField(max_length=20, choices=ESTATUS_CHOICES, default='Pendiente')

    class Meta:
        db_table = 'apartados'


class Multa(models.Model):
    ESTATUS_CHOICES = [
        ('Activa',   'Activa'),
        ('Cumplida', 'Cumplida'),
    ]
    multa_id           = models.AutoField(primary_key=True)
    prestamo           = models.ForeignKey(Prestamo, on_delete=models.CASCADE, db_column='prestamo_id')
    usuario            = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='usuario_id')
    multa_dias_bloqueo = models.IntegerField()
    multa_motivo       = models.CharField(max_length=255)
    multa_fecha_inicio = models.DateField()
    multa_fecha_fin    = models.DateField()
    multa_estatus      = models.CharField(max_length=20, choices=ESTATUS_CHOICES, default='Activa')

    class Meta:
        db_table = 'multas'