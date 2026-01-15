## Tech stack

- crawlee, cheerio
- @aduptive/instagram-scraper
- postgresql
- r2 bucket
- mistral ocr
- cloudflare workflows

rules:

## Data scrape

web: gambar, 
ig: gambar, caption, url instagram, instagram profile

## Alur simple

```mermaid
flowchart TD
    CRON --> A & B

    A[Scrape Web lomba] --> D
    B[Scrape IG profile] --> D
    C[Manual Link IG] --> D

    D[Upload Image + Insert DB] --> E[OCR] --> F[Update DB] --> H[Human Review DB] --> End

    class CRON,A,B,D,E,F scrape
    class C,H manual
    classDef scrape stroke:#1c6dd0,color:#fff
    classDef manual stroke:#B44A5C,color:#fff
```

## Alur kompleks

```mermaid
flowchart TD
    CRON --> A
    CRON --> B

    subgraph INPUTS
        A[Scrape Web lomba]
        B[Scrape IG profile]
        C[Manual Link IG]
    end

    subgraph MEDIA
        Z[R2]
        E[OCR]
    end

    subgraph DATABASE
        D[Postgres]
    end

    A -->|insert data| D
    B -->|insert data| D
    C -->|insert data| D

    A -->|upload image| Z
    B -->|upload image| Z
    C -->|upload image| Z

    Z -->|image url| D
    Z --> E
    E -->|text| D

    D --> H[Human Review] --> End

    class CRON,A,B,D,E,Z cron
    class C,H manual
    classDef cron stroke:#1c6dd0,color:#fff
    classDef manual stroke:#B44A5C,color:#fff

```

## Yg perlu diperhatikan
- Ini adalah sistem workflow automasi yang scrapping informasi lomba dari web dan instagram untuk kemudian disimpan ke dalam r2 bucket cloudflare dan database postgres yang telah didefinisikan schemanya, nantinya data tersebut akan digunakan untuk broadcasting dan sebagai database aplikasi katalog lomba
- Admin panel digunakan untuk mengecek dan mengupdate database postgres, yang CRUD nya juga dikorelasikan dengan cloudflare r2, mengirim pesan ke channel WA
- CRON nya berjalan tiap 12 jam sekali, selanjutnya 6 jam sekali
- Mekanisme data ekstraction 
- Mekanisme pengecekan insert db nya dari url instagram jika sama,  
- Tambahkan mekanisme edit gambar supaya ga sama sama amad sama data yg ada di instagram
- Human review diperlukan untuk mengecek apakah ada lomba yang duplikat, mengecek informasi lomba apakah sudah benar atau belum, mengirim info ke WA channel, 
- notif tiap data yang masuk dikirim ke grup wa
- 