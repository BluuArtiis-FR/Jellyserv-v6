import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // Important pour GitHub Pages : le nom du repo
    // Si le repo s'appelle "Jellyserv-v6", le base doit être "/Jellyserv-v6/"
    // On met "./" pour que ça marche relatif partout
    base: './',
})
