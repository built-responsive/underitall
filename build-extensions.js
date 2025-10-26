/**
 * Build script for Shopify Theme App Extension bundles
 * Creates standalone JavaScript bundles for calculator and chat blocks
 */

import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build configuration for calculator block
async function buildCalculator() {
  console.log('🔨 Building calculator block...');

  await build({
    root: path.resolve(__dirname, 'client'),
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client', 'src'),
        '@shared': path.resolve(__dirname, 'shared'),
      }
    },
    build: {
      outDir: path.resolve(__dirname, 'extensions/underitall-blocks/assets'),
      emptyOutDir: false,
      lib: {
        entry: path.resolve(__dirname, 'client/src/calculator-entry.tsx'),
        name: 'UnderItAllCalculator',
        fileName: () => 'calculator-block.js',
        formats: ['iife']
      },
      rollupOptions: {
        external: [],
        output: {
          globals: {},
          assetFileNames: 'calculator-block.[ext]'
        }
      }
    },
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });

  console.log('✓ Calculator block built successfully');
}

// Build configuration for chat block
async function buildChat() {
  console.log('🔨 Building chat block...');

  await build({
    root: path.resolve(__dirname, 'client'),
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client', 'src'),
        '@shared': path.resolve(__dirname, 'shared'),
      }
    },
    build: {
      outDir: path.resolve(__dirname, 'extensions/underitall-blocks/assets'),
      emptyOutDir: false,
      lib: {
        entry: path.resolve(__dirname, 'client/src/components/chat-bubble.tsx'),
        name: 'UnderItAllChat',
        fileName: () => 'chat-block.js',
        formats: ['iife']
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'react/jsx-runtime'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            'react/jsx-runtime': 'React'
          },
          assetFileNames: 'chat-block.[ext]'
        }
      }
    },
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });

  console.log('✓ Chat block built successfully');
}

// Build configuration for wholesale registration block
async function buildWholesaleRegistration() {
  console.log('🔨 Building wholesale registration block...');

  await build({
    root: path.resolve(__dirname, 'client'),
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client', 'src'),
        '@shared': path.resolve(__dirname, 'shared'),
      }
    },
    build: {
      outDir: path.resolve(__dirname, 'extensions/underitall-blocks/assets'),
      emptyOutDir: false,
      lib: {
        entry: path.resolve(__dirname, 'client/src/pages/wholesale-registration.tsx'),
        name: 'UnderItAllWholesaleRegistration',
        fileName: () => 'wholesale-registration-block.js',
        formats: ['iife']
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'react/jsx-runtime'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            'react/jsx-runtime': 'React'
          },
          assetFileNames: 'wholesale-registration-block.[ext]'
        }
      }
    },
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });

  console.log('✓ Wholesale registration block built successfully');
}


// Main build process
async function buildAll() {
  try {
    // Ensure asset directories exist
    fs.mkdirSync(path.resolve(__dirname, 'extensions/underitall-blocks/assets'), { recursive: true });

    // Build all blocks
    await buildCalculator();
    await buildChat();
    await buildWholesaleRegistration();

    console.log('\n✨ All theme app blocks built successfully!');
    console.log('\n📦 Next steps:');
    console.log('1. Deploy your Shopify app using: shopify app deploy');
    console.log('2. Add the blocks to your theme in the Theme Customizer');
    console.log('\n💡 Production API: https://its-under-it-all.replit.app');
    console.log('\n💡 Assets created:');
    console.log('   - extensions/underitall-blocks/assets/calculator-block.js');
    console.log('   - extensions/underitall-blocks/assets/calculator-block.css');
    console.log('   - extensions/underitall-blocks/assets/chat-block.js');
    console.log('   - extensions/underitall-blocks/assets/chat-block.css');
    console.log('   - extensions/underitall-blocks/assets/wholesale-registration-block.js');
    console.log('   - extensions/underitall-blocks/assets/wholesale-registration-block.css');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildAll();