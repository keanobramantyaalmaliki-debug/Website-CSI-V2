# server/ — API CMS

Proses Node terpisah dari situs. Situs publik **tidak pernah** memanggilnya:
API ini cuma dipakai panel admin untuk menyunting, dan tombol Publish yang
menulis `content.json`. Kalau proses ini mati, situs tetap tayang.

Sengaja punya `tsconfig.json` sendiri: tsconfig root berlaku ke seluruh repo
dengan `lib: ["dom"]`, jadi tanpa berkas ini kode server diperiksa seolah punya
`document` dan `window` — autocomplete yang menyesatkan, dan `bun run build`
ikut memeriksanya dengan aturan yang salah. Root sudah meng-`exclude` folder ini.

Aturan impor: `server/ → shared/` boleh, `src/ → server/` **tidak pernah**.
