'use client';

import { useState } from 'react';
import { Mail, Search } from 'lucide-react';
import TextField from '@/shared/components/TextField/TextField';
import { Card } from '@/shared/components/Cards';

export default function TextFieldPage() {
  const [texto, setTexto] = useState('');
  const [conPlaceholder, setConPlaceholder] = useState('');
  const [requerido, setRequerido] = useState('');
  const [deshabilitado, setDeshabilitado] = useState('No editable');
  const [soloLectura, setSoloLectura] = useState('Solo lectura');
  const [password, setPassword] = useState('secreto');
  const [email, setEmail] = useState('');
  const [numero, setNumero] = useState('42');
  const [dni, setDni] = useState('');
  const [moneda, setMoneda] = useState('1500000');
  const [monedaDecimal, setMonedaDecimal] = useState('1234,5');
  const [telefono, setTelefono] = useState('+56');
  const [anio, setAnio] = useState('2020');
  const [notas, setNotas] = useState('');
  const [normal, setNormal] = useState('Variante normal');
  const [contrast, setContrast] = useState('Sobre fondo primary');
  const [autocomplete, setAutocomplete] = useState('Búsqueda');
  const [endIcon, setEndIcon] = useState('');
  const [codigo, setCodigo] = useState('');

  return (
    <div className="p-8 space-y-12 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">TextField — casos de uso</h1>
        <p className="text-gray-600">
          Ejemplos interactivos del input con etiqueta flotante, formatos (RUT, moneda, teléfono) y
          variantes.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Texto básico</h2>
        <TextField
          label="Nombre"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej: Ana Pérez"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Placeholder distinto al label</h2>
        <TextField
          label="Búsqueda"
          value={conPlaceholder}
          onChange={(e) => setConPlaceholder(e.target.value)}
          placeholder="Escribe para filtrar…"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Requerido</h2>
        <TextField
          label="Correo corporativo"
          required
          value={requerido}
          onChange={(e) => setRequerido(e.target.value)}
          type="email"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Deshabilitado y solo lectura</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Deshabilitado"
            value={deshabilitado}
            onChange={(e) => setDeshabilitado(e.target.value)}
            disabled
          />
          <TextField
            label="Solo lectura"
            value={soloLectura}
            onChange={(e) => setSoloLectura(e.target.value)}
            readOnly
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Contraseña (toggle de visibilidad)</h2>
        <TextField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Email y número</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            startAdornment={<Mail className="h-4 w-4" aria-hidden />}
          />
          <TextField
            label="Stock"
            type="number"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            min={0}
            max={9999}
            step={1}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">DNI / RUT (formateo chileno)</h2>
        <TextField
          label="RUT o DNI"
          type="dni"
          name="dni"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          placeholder="12.345.678-9"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Moneda (CLP)</h2>
        <TextField
          label="Precio de lista"
          type="currency"
          value={moneda}
          onChange={(e) => setMoneda(e.target.value)}
          currencySymbol="$"
        />
        <p className="text-sm text-gray-500">
          Valor almacenado numérico en string; se muestra con separadores es-CL.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Moneda con decimales (coma)</h2>
        <TextField
          label="Monto con centavos"
          type="currency"
          value={monedaDecimal}
          onChange={(e) => setMonedaDecimal(e.target.value)}
          currencySymbol="€"
          allowDecimalComma
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Teléfono con prefijo</h2>
        <TextField
          label="Celular"
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          phonePrefix="+56"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Año (datePicker interno: número 1800—actual)</h2>
        <TextField
          label="Año de fabricación"
          type="datePicker"
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Textarea (varias líneas)</h2>
        <TextField
          label="Notas"
          type="textarea"
          rows={4}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Detalle opcional…"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Adornos: icono al inicio y al final (string)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Código"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            startIcon="#"
            placeholder="Solo demostración"
            className="w-full"
          />
          <TextField
            label="Etiqueta final"
            value={endIcon}
            onChange={(e) => setEndIcon(e.target.value)}
            endIcon="✓"
          />
        </div>
        <p className="text-sm text-gray-500">
          En producción se suelen acoplar iconos reales; aquí se muestran strings para la API
          expuesta.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Variantes: normal, contrast, autocomplete</h2>
        <TextField
          label="Normal"
          variante="normal"
          value={normal}
          onChange={(e) => setNormal(e.target.value)}
        />
        <div className="rounded-lg border border-primary/30 bg-primary p-4">
          <TextField
            label="Contrast (texto claro en barra de color)"
            variante="contrast"
            value={contrast}
            onChange={(e) => setContrast(e.target.value)}
          />
        </div>
        <Card>
          <p className="text-sm text-gray-500 mb-3">
            Autocomplete: sin borde, pensado para ir dentro de un contenedor (p. ej. desplegable).
          </p>
          <TextField
            label="Buscar en lista"
            variante="autocomplete"
            value={autocomplete}
            onChange={(e) => setAutocomplete(e.target.value)}
            startAdornment={<Search className="h-4 w-4" aria-hidden />}
          />
        </Card>
      </section>
    </div>
  );
}
