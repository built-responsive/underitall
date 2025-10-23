
# UnderItAll Calc - Shopify Theme App Extension

A React-based Shopify Theme App Block for custom rug pad quoting. This extension provides an interactive calculator that allows customers to get real-time pricing for custom rug pads based on dimensions, product type, and quantity.

## Features

- **Interactive Calculator**: Real-time pricing based on width, length, shape, and quantity
- **Dynamic Pricing**: CSV-based pricing matrices for thin and thick rug pads
- **Brand-Aligned Design**: Full UnderItAll brand styling with custom colors and typography
- **Theme Integration**: Seamless integration as a Shopify Theme App Block
- **Mobile Responsive**: Optimized for all device sizes
- **Product Options**: 
  - Luxe Lite ⅛" (Thin) and Luxe ¼" (Thick) options
  - Rectangle, Square, Round, and Free Form shapes
  - Size range: 2-40 feet

## Project Structure

```
underitall-calc/
├── extensions/
│   └── underitall-calc/
│       ├── blocks/
│       │   └── underitall-calc.liquid    # Liquid template for Theme App Block
│       ├── assets/
│       │   ├── calc-app.js               # Bundled React app
│       │   └── calc-app.css              # Brand styles
│       ├── locales/
│       │   └── en.default.json           # Localization
│       └── shopify.extension.toml        # Extension manifest
├── src/
│   ├── App.jsx                           # Main React component
│   ├── App.css                           # Component styles
│   └── main.jsx                          # Entry point
├── index.html                            # Dev server HTML
├── server.js                             # Express production server
├── vite.config.js                        # Vite configuration
└── package.json                          # Dependencies
```

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- Shopify Partner account (for deployment)
- Shopify CLI (for deployment)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd underitall-calc
```

2. Install dependencies:
```bash
npm install
```

### Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5000`

### Building for Production

Build the React app for deployment:
```bash
npm run build
```

This will:
1. Compile the React app using Vite
2. Output bundled files to `dist/assets/`
3. Copy `calc-app.js` and `calc-app.css` to `extensions/underitall-calc/assets/`

## Deployment

### Replit Deployment (Production)

This app is deployed on **Replit** at `https://uia-calc.replit.app`

1. **Build the project**:
```bash
npm run build
```

2. **Start the production server**:
```bash
npm start
```

The Express server (`server.js`) serves:
- Static files from `dist/` on port 5000
- Port 5000 is mapped to 80/443 for public access

3. **Deploy via Replit**:
   - Click the **Deploy** button in Replit
   - The deployment automatically runs `npm install && npm run build`, then `npm start`

### Adding to a Shopify Theme

1. In your Shopify admin, go to **Online Store > Themes**
2. Click **Customize** on your active theme
3. Navigate to the page where you want to add the calculator
4. Click **Add section** or **Add block**
5. Search for "UnderItAll Calc" and add it to your page
6. Configure the pricing matrix URLs in the block settings

## Configuration

### Pricing Matrices

The calculator uses Google Sheets published as CSV for pricing data. Configure the URLs in the Liquid block settings:

- **Thick Matrix URL**: CSV URL for Luxe ¼" pricing
- **Thin Matrix URL**: CSV URL for Luxe Lite ⅛" pricing

Default URLs are provided but can be updated in the Theme Customizer.

### CSV Format

The pricing CSV should follow this format:
```
Width,2,3,4,5,6,7,8,9,10,11,12,...
2,11.00,11.00,11.00,11.00,11.00,11.00,11.00,11.00,11.00,11.00,11.00,...
3,11.00,11.00,11.00,11.00,11.00,11.00,11.00,11.00,11.00,11.00,11.00,...
...
```

- First row: Header with length values
- First column: Width values
- Remaining cells: Price per square foot for that width/length combination

## Brand Styling

The extension follows UnderItAll brand guidelines:

### Colors
- **Rorange**: `#F2633A` (Primary accent)
- **Felt Gray**: `#696A6D` (Secondary)
- **Greige**: `#E1E0DA` (Neutral background)
- **Soft Black**: `#212227` (Text)
- **Cream**: `#F3F1E9` (Background)

### Typography
- **Archivo**: Headlines and headings
- **Lora Italic**: Accent text and features
- **Vazirmatn**: Body text and forms

### Design System
- Border radius: 11px (small), 16px (medium), 22px (large)
- Spacing: 8px, 12px, 16px, 24px, 32px
- Mobile-first responsive design

## Scripts

- `npm run dev` - Start Vite dev server (port 5000)
- `npm run build` - Build for production and copy to extension assets
- `npm run preview` - Preview production build with Vite
- `npm start` - Start Express production server (port 5000)

## Production Architecture

- **Server**: Express.js (`server.js`)
- **Port**: 5000 (mapped to 80/443 in deployment)
- **Static Files**: Served from `dist/` directory
- **Deployment URL**: `https://uia-calc.replit.app`
- **Shopify App Proxy**: `/apps/app` routes to `https://uia-calc.replit.app`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Build Issues

If the build fails:
1. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Ensure Node.js version is 20 or higher: `node --version`

### CSV Loading Issues

If pricing doesn't load:
1. Verify CSV URLs are publicly accessible
2. Check browser console for CORS errors
3. Ensure CSV format matches expected structure
4. Test URLs directly in browser

### Deployment Issues

If the deployed app shows 404:
1. Ensure deployment is running (check Replit Deployments panel)
2. Verify build completed successfully (`npm run build`)
3. Check that Express server is serving on port 5000
4. Confirm `.replit` has correct build/run commands

### Theme Integration Issues

If the block doesn't appear in Theme Customizer:
1. Ensure the extension is properly deployed
2. Check that `shopify.extension.toml` is configured correctly
3. Verify the app is installed on your store
4. Try refreshing the Theme Customizer

## License

Proprietary - UnderItAll

## Support

For questions or issues, contact the UnderItAll development team.
