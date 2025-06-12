# Component Structure

This project follows the Atomic Design methodology for organizing components:

## Structure

```
components/
├── atoms/         # Smallest building blocks (buttons, inputs, icons)
├── molecules/     # Groups of atoms (form fields, search bars)
├── organisms/     # Complex components (forms, media players)
├── templates/     # Page layouts
└── pages/         # Complete pages (moved to src/pages)
```

## Design Principles

1. **Atoms** are the basic building blocks - small, reusable components that serve a single purpose
   - Buttons, inputs, labels, icons

2. **Molecules** combine atoms to create more complex UI elements with specific functionality
   - Form fields (label + input), search bar (input + button)

3. **Organisms** combine molecules and atoms into more complex components
   - Navigation bars, media players, forms

4. **Templates** define page layouts without specific content
   - Layout grids, page shells

5. **Pages** represent complete screens with actual content (located in src/pages)

## Guidelines

- Keep components focused on a single responsibility
- Maintain proper typing with TypeScript
- Document component props with JSDoc comments
- Use composition over inheritance
- Follow naming conventions:
  - Use PascalCase for component names
  - Use camelCase for props and functions 