# **App Name**: LabRe LIMS

## Core Features:

- Sample Tracking: Track samples from collection to disposal using a unique sample ID and barcode system. The system manages sample details such as storage location, volume, and status.
- Experiment Management: Manage experiments, track reagents, and link samples to experiments. Log equipment usage and store results.
- Inventory Management: Monitor reagent and consumable inventory levels, track lot numbers and expiry dates, and receive alerts for low stock or expired items. The system will automatically decrement reagent stock when experiments are completed.
- Reporting and Analytics: Generate reports and dashboards summarizing lab activities, reagent usage, and sample processing metrics. This feature provides insights into lab performance and resource utilization.
- Audit Trail: Maintain a comprehensive audit log of all actions performed in the system, including user, timestamp, and changes made. Facilitates compliance and data integrity.
- Barcode Generation: Automatically generate barcodes and QR codes for samples, reagents, equipment, and storage units using Google Charts API. Store the generated images in Google Drive and reference them in the corresponding tables. Facilitates tracking entities
- SOP Enforcer: AI tool for ensuring Standard Operating Procedures (SOP) adherence. Uses LLM reasoning to decide when non-compliant lab events are recorded. Non-compliant actions generate user notifications to remediate SOP breakage.

## Style Guidelines:

- Primary color: Teal (#008080) to represent the professional and precise nature of a laboratory environment, taken from the image you attached.
- Background color: Light cyan (#E0FFFF) for a clean and neutral backdrop, taken from the image you attached.
- Accent color: Pale turquoise (#AFEEEE) for subtle highlights and interactive elements, taken from the image you attached.
- Body and headline font: 'Inter', sans-serif, for a modern, neutral, and machined look.
- Use clear and recognizable icons from a consistent set (e.g., Material Design Icons) to represent different modules, actions, and statuses.
- Employ a clean and structured layout with a sidebar for navigation, cards for displaying information, and consistent use of whitespace to improve readability.
- Incorporate subtle transitions and animations to provide feedback on user interactions and enhance the overall user experience. Avoid excessive animations that could distract from the data.