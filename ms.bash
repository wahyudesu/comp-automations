curl --location 'https://api.mistral.ai/v1/ocr' \
--header 'Content-Type: application/json' \
--header "Authorization: Bearer JIzjS6jtWX3NCjsbAgNsJ4XF5MeHTE07" \
--data '{
  "model": "mistral-ocr-latest",
  "document": {
    "type": "image_url",
    "image_url": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiQcVygehhorodFgYDYlWKlSd8srRJRo1zqcDMV4DH_to2rEoj8NztX9yD_IS6Yalc4Um9wz5SjzzU8T2KWxlhuonXDhsTTZiE1hNtmmuIsAZBljSqvf7L8SpDqvAW6svnPHcecuP0YLAeecMxXvsg79YYd3iU25ZvI5V7LbeYOIQpieBc-6SLvQAkE6Ymw/s1280/IMG-20251215-WA0055.jpg"
  },
  "document_annotation_format": {
    "type": "json_schema",
    "json_schema": {
      "schema": {
        "properties": {
          "title": {"title": "Title", "description": "Judul kompetisi", "type": "string"},
          "organizer": {"title": "Organizer", "description": "Penyelenggara kompetisi", "type": "string"},
          "categories": {"title": "Categories", "description": "Kategori lomba", "type": "string"},
          "level": {"title": "Level", "description": "Tingkat peserta (SD, SMP, SMA, Mahasiswa, Umum)", "type": "string"},
          "startDate": {"title": "StartDate", "description": "Tanggal mulai registrasi, format YYYY-MM-DD", "type": "string"},
          "endDate": {"title": "EndDate", "description": "Tanggal selesai registrasi, format YYYY-MM-DD", "type": "string"},
          "format": {"title": "Format", "description": "Format pelaksanaan (Online, Offline, Hybrid)", "type": "string"},
          "participationType": {"title": "ParticipationType", "description": "Tipe partisipasi (Individual, Team)", "type": "string"},
          "pricing": {"title": "Pricing", "description": "Biaya pendaftaran dalam rupiah", "type": "string"},
          "contact": {"title": "Contact", "description": "Kontak penyelenggara", "type": "string"},
          "guideUrl": {"title": "GuideUrl", "description": "URL panduan kompetisi", "type": "string"},
          "registrationUrl": {"title": "RegistrationUrl", "description": "Link URL pendaftaran", "type": "string"},
          "socialMedia": {"title": "SocialMedia", "description": "Media sosial penyelenggara", "type": "string"}
        },
        "required": [],
        "title": "CompetitionAnnotation",
        "type": "object",
        "additionalProperties": false
      },
      "name": "competition_annotation",
      "strict": true
    }
  },
  "include_image_base64": true
}' | jq '.document_annotation' > ocr_output.json
