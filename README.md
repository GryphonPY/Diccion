# 🎙️ Dicción — Asistente de Dictado por Voz y Redacción con IA

Aplicación web moderna y minimalista para dictado, grabación de audio en vivo y pulido inteligente de notas y redacción asistida por inteligencia artificial (Google Gemini).

---

## ✨ Funcionalidades Clave

* 🎙️ **Grabación de Audio en Tiempo Real:**
  * Captura de audio de alta fidelidad desde el navegador con visualización de onda sonora en vivo (`Live Waveform Visualizer`).
  * Transcripción continua y edición instantánea del texto dictado.

* 🧠 **Pulido Inteligente con IA (Gemini):**
  * **Modo Estándar:** Corrección ortográfica, gramatical y mejora de fluidez sin perder la esencia.
  * **Resumen Conciso:** Extrae las ideas centrales en pocas oraciones claras.
  * **Puntos Clave:** Transforma el dictado en una lista estructurada con viñetas.
  * **Tono Formal:** Reestructura el texto con estilo profesional, ejecutivo o académico.
  * **Prompt Personalizado:** Permite dar instrucciones específicas al modelo para transformar el texto según la necesidad.

* 📝 **Gestión de Notas y Markdown:**
  * Renderizado completo de formato enriquecido con Markdown (`marked`).
  * Guardado local de notas, historial y timestamps de modificación.

* 🔒 **Arquitectura Serverless Segura:**
  * Diseñado con proxy serverless en Netlify (`/.netlify/functions/gemini-proxy`) para proteger las credenciales de API sin exponer llaves en el cliente.

---

## 🛠️ Tecnologías Utilizadas

* **Lenguajes:** TypeScript, HTML5, CSS3 Moderno
* **APIs Web:** Web Audio API (Analizador de frecuencias en tiempo real), Web Speech / MediaStream Recording
* **Motor de IA:** Google Gemini 2.5 Flash
* **Despliegue:** Preparado para Netlify Functions

---

## 🚀 Cómo Ejecutar en Local

1. Clona el repositorio:
   ```bash
   git clone https://github.com/GryphonPY/Diccion.git
   cd Diccion
   ```
2. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```
3. *(Opcional)* Configura tu entorno en `.env.local` con tu `GEMINI_API_KEY`.
4. Inicia el entorno local:
   ```bash
   npm run dev
   ```
