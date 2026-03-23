from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from datetime import date
from .models import Usuario, Libro, Categoria, Editorial, Prestamo, Apartado, Multa, detectar_rol, ADMIN_MATRICULA
import re


# ─────────────────────────────────────────
# Auth
# ─────────────────────────────────────────

class RegistroSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Usuario
        fields = [
            'usuario_nombre', 'usuario_aPaterno', 'usuario_aMaterno',
            'matricula_id', 'usuario_email', 'usuario_password',
        ]
        extra_kwargs = {'usuario_password': {'write_only': True}}

    def solo_letras(self, valor):
        return bool(re.match(r'^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$', valor.strip()))

    def validate_usuario_nombre(self, value):
        if not self.solo_letras(value):
            raise serializers.ValidationError("El nombre solo puede contener letras y espacios.")
        return value.strip()

    def validate_usuario_aPaterno(self, value):
        if not self.solo_letras(value):
            raise serializers.ValidationError("El apellido paterno solo puede contener letras y espacios.")
        return value.strip()

    def validate_usuario_aMaterno(self, value):
        if value and not self.solo_letras(value):
            raise serializers.ValidationError("El apellido materno solo puede contener letras y espacios.")
        return value.strip() if value else value

    def validate_matricula_id(self, value):
        value = value.strip()
        # No permitir que nadie se registre como AdminBiblioteca
        if value == ADMIN_MATRICULA:
            raise serializers.ValidationError("Identificador no permitido.")
        try:
            detectar_rol(value)
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        return value.upper() if not value.isdigit() else value

    def validate_usuario_password(self, value):
        if len(value) < 6:
            raise serializers.ValidationError("La contraseña debe tener al menos 6 caracteres.")
        return value

    def validate_usuario_email(self, value):
        if Usuario.objects.filter(usuario_email__iexact=value).exists():
            raise serializers.ValidationError("Este correo ya está registrado.")
        return value.lower()

    def create(self, validated_data):
        validated_data['usuario_password'] = make_password(validated_data['usuario_password'])
        # Rol se detecta automáticamente, nunca viene del frontend
        validated_data['usuario_rol'] = detectar_rol(validated_data['matricula_id'])
        return super().create(validated_data)


class LoginSerializer(serializers.Serializer):
    matricula_id     = serializers.CharField()
    usuario_password = serializers.CharField(write_only=True)

    def validate(self, data):
        matricula = data['matricula_id'].strip()
        try:
            usuario = Usuario.objects.get(matricula_id=matricula)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Matrícula o contraseña incorrectos.")
        if not check_password(data['usuario_password'], usuario.usuario_password):
            raise serializers.ValidationError("Matrícula o contraseña incorrectos.")
        data['usuario'] = usuario
        return data


# ─────────────────────────────────────────
# Usuario
# ─────────────────────────────────────────

class UsuarioSerializer(serializers.ModelSerializer):
    esta_bloqueado         = serializers.SerializerMethodField()
    dias_bloqueo_restantes = serializers.SerializerMethodField()
    es_admin               = serializers.SerializerMethodField()

    class Meta:
        model  = Usuario
        fields = [
            'usuario_id', 'usuario_nombre', 'usuario_aPaterno', 'usuario_aMaterno',
            'matricula_id', 'usuario_email', 'usuario_rol', 'usuario_bloqueado_hasta',
            'esta_bloqueado', 'dias_bloqueo_restantes', 'es_admin',
        ]

    def get_esta_bloqueado(self, obj):
        return bool(obj.usuario_bloqueado_hasta and obj.usuario_bloqueado_hasta >= date.today())

    def get_dias_bloqueo_restantes(self, obj):
        if obj.usuario_bloqueado_hasta and obj.usuario_bloqueado_hasta >= date.today():
            return (obj.usuario_bloqueado_hasta - date.today()).days
        return 0

    def get_es_admin(self, obj):
        return obj.matricula_id == ADMIN_MATRICULA


class UsuarioAdminSerializer(serializers.ModelSerializer):
    """
    Usado por el admin para crear/editar usuarios.
    - El ROL se detecta automáticamente por el formato de la matrícula/número de trabajador.
    - El admin NO elige el rol manualmente.
    - El admin NO puede ver ni cambiar contraseñas de usuarios existentes.
    - La contraseña solo se establece al CREAR.
    """
    esta_bloqueado         = serializers.SerializerMethodField()
    dias_bloqueo_restantes = serializers.SerializerMethodField()
    usuario_password       = serializers.CharField(write_only=True, required=False)

    class Meta:
        model  = Usuario
        fields = [
            'usuario_id', 'usuario_nombre', 'usuario_aPaterno', 'usuario_aMaterno',
            'matricula_id', 'usuario_email', 'usuario_rol',
            'usuario_bloqueado_hasta', 'esta_bloqueado', 'dias_bloqueo_restantes',
            'usuario_password',
        ]
        # usuario_rol es solo lectura: se muestra pero nunca lo elige el admin
        read_only_fields = ['usuario_rol']

    def solo_letras(self, valor):
        return bool(re.match(r'^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$', valor.strip()))

    def validate_usuario_nombre(self, value):
        if not self.solo_letras(value):
            raise serializers.ValidationError("El nombre solo puede contener letras y espacios.")
        return value.strip()

    def validate_usuario_aPaterno(self, value):
        if not self.solo_letras(value):
            raise serializers.ValidationError("El apellido paterno solo puede contener letras y espacios.")
        return value.strip()

    def validate_usuario_aMaterno(self, value):
        if value and not self.solo_letras(value):
            raise serializers.ValidationError("El apellido materno solo puede contener letras y espacios.")
        return value.strip() if value else value

    def validate_matricula_id(self, value):
        value = value.strip()
        # No permitir crear otro AdminBiblioteca
        if value == ADMIN_MATRICULA:
            raise serializers.ValidationError("Ese identificador está reservado.")
        try:
            detectar_rol(value)
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        # Mayúsculas para matrícula de alumno, dígitos puros para docente
        return value.upper() if not value.isdigit() else value

    def get_esta_bloqueado(self, obj):
        return bool(obj.usuario_bloqueado_hasta and obj.usuario_bloqueado_hasta >= date.today())

    def get_dias_bloqueo_restantes(self, obj):
        if obj.usuario_bloqueado_hasta and obj.usuario_bloqueado_hasta >= date.today():
            return (obj.usuario_bloqueado_hasta - date.today()).days
        return 0

    def create(self, validated_data):
        password = validated_data.get('usuario_password')
        if not password:
            raise serializers.ValidationError({'usuario_password': 'La contraseña es requerida al crear un usuario.'})
        validated_data['usuario_password'] = make_password(password)
        # Auto-detectar rol desde la matrícula — nunca del request
        validated_data['usuario_rol'] = detectar_rol(validated_data['matricula_id'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Nunca actualizar contraseña ni rol manualmente
        validated_data.pop('usuario_password', None)
        validated_data.pop('usuario_rol', None)
        # Si cambia la matrícula, recalcular el rol
        if 'matricula_id' in validated_data:
            validated_data['usuario_rol'] = detectar_rol(validated_data['matricula_id'])
        return super().update(instance, validated_data)


# ─────────────────────────────────────────
# Categorías, Editoriales y Libros
# ─────────────────────────────────────────

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Categoria
        fields = ['categoria_id', 'categoria_nombre']


class EditorialSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Editorial
        fields = ['editorial_id', 'editorial_nombre']


class LibroSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.categoria_nombre', read_only=True)
    editorial_nombre = serializers.CharField(source='editorial.editorial_nombre', read_only=True)

    class Meta:
        model  = Libro
        fields = [
            'libro_id', 'libro_titulo', 'libro_autor',
            'libro_isbn', 'libro_ejemplares', 'libro_descripcion',
            'categoria', 'categoria_nombre',
            'editorial', 'editorial_nombre',
        ]


# ─────────────────────────────────────────
# Préstamos
# ─────────────────────────────────────────

class PrestamoSerializer(serializers.ModelSerializer):
    libro_titulo                = serializers.CharField(source='libro.libro_titulo', read_only=True)
    libro_autor                 = serializers.CharField(source='libro.libro_autor',  read_only=True)
    usuario_nombre              = serializers.SerializerMethodField()
    usuario_id                  = serializers.IntegerField(source='usuario.usuario_id', read_only=True)
    matricula_id                = serializers.CharField(source='usuario.matricula_id',  read_only=True)
    usuario_rol                 = serializers.CharField(source='usuario.usuario_rol',   read_only=True)
    dias_retraso                = serializers.SerializerMethodField()
    prestamo_entregado_admin    = serializers.BooleanField(read_only=True)
    prestamo_fecha_entrega_real = serializers.DateField(read_only=True)

    class Meta:
        model  = Prestamo
        fields = [
            'prestamo_id', 'usuario_id', 'usuario_nombre', 'matricula_id', 'usuario_rol',
            'libro_id', 'libro_titulo', 'libro_autor',
            'prestamo_fecha_salida', 'prestamo_fecha_entrega_esperada',
            'prestamo_fecha_devolucion_real', 'prestamo_estatus',
            'prestamo_dias_plazo', 'dias_retraso',
            'prestamo_entregado_admin', 'prestamo_fecha_entrega_real',
        ]

    def get_usuario_nombre(self, obj):
        u = obj.usuario
        return f"{u.usuario_nombre} {u.usuario_aPaterno} {u.usuario_aMaterno}".strip()

    def get_dias_retraso(self, obj):
        if obj.prestamo_estatus == 'Activo':
            hoy = date.today()
            if hoy > obj.prestamo_fecha_entrega_esperada:
                return (hoy - obj.prestamo_fecha_entrega_esperada).days
        return 0


class PrestamoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Prestamo
        fields = [
            'usuario', 'libro',
            'prestamo_fecha_salida', 'prestamo_fecha_entrega_esperada',
            'prestamo_estatus', 'prestamo_dias_plazo',
        ]


# ─────────────────────────────────────────
# Apartados
# ─────────────────────────────────────────

class ApartadoSerializer(serializers.ModelSerializer):
    libro_titulo   = serializers.CharField(source='libro.libro_titulo', read_only=True)
    libro_autor    = serializers.CharField(source='libro.libro_autor',  read_only=True)
    usuario_nombre = serializers.SerializerMethodField()
    usuario_id     = serializers.IntegerField(source='usuario.usuario_id', read_only=True)
    matricula_id   = serializers.CharField(source='usuario.matricula_id',  read_only=True)
    usuario_rol    = serializers.CharField(source='usuario.usuario_rol',   read_only=True)
    dias_restantes = serializers.SerializerMethodField()

    class Meta:
        model  = Apartado
        fields = [
            'apartado_id', 'usuario_id', 'usuario_nombre', 'matricula_id', 'usuario_rol',
            'libro_id', 'libro_titulo', 'libro_autor',
            'apartado_fecha', 'apartado_fecha_expiracion',
            'apartado_fecha_asignacion', 'apartado_fecha_limite_recogida',
            'apartado_estatus', 'dias_restantes',
        ]

    def get_usuario_nombre(self, obj):
        u = obj.usuario
        return f"{u.usuario_nombre} {u.usuario_aPaterno} {u.usuario_aMaterno}".strip()

    def get_dias_restantes(self, obj):
        hoy = date.today()
        if obj.apartado_estatus == 'Pendiente':
            return max((obj.apartado_fecha_expiracion - hoy).days, 0)
        if obj.apartado_estatus == 'Asignado' and obj.apartado_fecha_limite_recogida:
            return max((obj.apartado_fecha_limite_recogida - hoy).days, 0)
        return 0


class ApartadoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Apartado
        fields = [
            'usuario', 'libro',
            'apartado_fecha', 'apartado_fecha_expiracion',
            'apartado_fecha_asignacion', 'apartado_fecha_limite_recogida',
            'apartado_estatus',
        ]


class ApartadoUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Apartado
        fields = ['apartado_estatus']


# ─────────────────────────────────────────
# Multas
# ─────────────────────────────────────────

class MultaSerializer(serializers.ModelSerializer):
    libro_titulo = serializers.CharField(source='prestamo.libro.libro_titulo', read_only=True)

    class Meta:
        model  = Multa
        fields = [
            'multa_id', 'prestamo_id', 'libro_titulo',
            'multa_dias_bloqueo', 'multa_motivo',
            'multa_fecha_inicio', 'multa_fecha_fin',
            'multa_estatus',
        ]