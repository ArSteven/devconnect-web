/**
 * Logos de tecnologías: Devicon (https://devicon.dev, licencia MIT), servidos por jsDelivr
 * con versión fija. Las marcas pertenecen a sus dueños. Lo que no tenga ícono se muestra
 * como una insignia con su nombre.
 */
const VERSION_DEVICON = '2.17.0';

interface Tecnologia {
  nombre: string; // como se escribe correctamente
  icono?: string; // carpeta de Devicon
  variante?: string; // archivo dentro de la carpeta: <icono>-<variante>.svg
}

// La clave es el nombre normalizado (minúsculas, sin espacios, puntos ni guiones).
const TECNOLOGIAS: Record<string, Tecnologia> = {
  go: { nombre: 'Go', icono: 'go', variante: 'original-wordmark' },
  golang: { nombre: 'Go', icono: 'go', variante: 'original-wordmark' },
  angular: { nombre: 'Angular', icono: 'angular' },
  angularjs: { nombre: 'AngularJS', icono: 'angularjs' },
  typescript: { nombre: 'TypeScript', icono: 'typescript' },
  ts: { nombre: 'TypeScript', icono: 'typescript' },
  javascript: { nombre: 'JavaScript', icono: 'javascript' },
  js: { nombre: 'JavaScript', icono: 'javascript' },
  python: { nombre: 'Python', icono: 'python' },
  java: { nombre: 'Java', icono: 'java' },
  php: { nombre: 'PHP', icono: 'php' },
  sql: { nombre: 'SQL' },
  otro: { nombre: 'Otro' },
  postgresql: { nombre: 'PostgreSQL', icono: 'postgresql' },
  postgres: { nombre: 'PostgreSQL', icono: 'postgresql' },
  mysql: { nombre: 'MySQL', icono: 'mysql' },
  mariadb: { nombre: 'MariaDB', icono: 'mariadb' },
  sqlite: { nombre: 'SQLite', icono: 'sqlite' },
  sqlserver: { nombre: 'SQL Server', icono: 'microsoftsqlserver' },
  microsoftsqlserver: { nombre: 'SQL Server', icono: 'microsoftsqlserver' },
  oracle: { nombre: 'Oracle', icono: 'oracle' },
  mongodb: { nombre: 'MongoDB', icono: 'mongodb' },
  mongo: { nombre: 'MongoDB', icono: 'mongodb' },
  redis: { nombre: 'Redis', icono: 'redis' },
  firebase: { nombre: 'Firebase', icono: 'firebase' },
  supabase: { nombre: 'Supabase', icono: 'supabase' },
  git: { nombre: 'Git', icono: 'git' },
  github: { nombre: 'GitHub', icono: 'github' },
  gitlab: { nombre: 'GitLab', icono: 'gitlab' },
  docker: { nombre: 'Docker', icono: 'docker' },
  kubernetes: { nombre: 'Kubernetes', icono: 'kubernetes' },
  linux: { nombre: 'Linux', icono: 'linux' },
  ubuntu: { nombre: 'Ubuntu', icono: 'ubuntu' },
  bash: { nombre: 'Bash', icono: 'bash' },
  powershell: { nombre: 'PowerShell', icono: 'powershell' },
  nginx: { nombre: 'Nginx', icono: 'nginx' },
  html: { nombre: 'HTML', icono: 'html5' },
  html5: { nombre: 'HTML', icono: 'html5' },
  css: { nombre: 'CSS', icono: 'css3' },
  css3: { nombre: 'CSS', icono: 'css3' },
  sass: { nombre: 'Sass', icono: 'sass' },
  scss: { nombre: 'Sass', icono: 'sass' },
  bootstrap: { nombre: 'Bootstrap', icono: 'bootstrap' },
  tailwind: { nombre: 'Tailwind CSS', icono: 'tailwindcss' },
  tailwindcss: { nombre: 'Tailwind CSS', icono: 'tailwindcss' },
  react: { nombre: 'React', icono: 'react' },
  reactjs: { nombre: 'React', icono: 'react' },
  reactnative: { nombre: 'React Native', icono: 'react' },
  vue: { nombre: 'Vue', icono: 'vuejs' },
  vuejs: { nombre: 'Vue', icono: 'vuejs' },
  svelte: { nombre: 'Svelte', icono: 'svelte' },
  nextjs: { nombre: 'Next.js', icono: 'nextjs' },
  next: { nombre: 'Next.js', icono: 'nextjs' },
  nuxt: { nombre: 'Nuxt', icono: 'nuxtjs' },
  nuxtjs: { nombre: 'Nuxt', icono: 'nuxtjs' },
  node: { nombre: 'Node.js', icono: 'nodejs' },
  nodejs: { nombre: 'Node.js', icono: 'nodejs' },
  express: { nombre: 'Express', icono: 'express' },
  expressjs: { nombre: 'Express', icono: 'express' },
  nestjs: { nombre: 'NestJS', icono: 'nestjs' },
  nest: { nombre: 'NestJS', icono: 'nestjs' },
  jquery: { nombre: 'jQuery', icono: 'jquery' },
  vite: { nombre: 'Vite', icono: 'vite' },
  npm: { nombre: 'npm', icono: 'npm', variante: 'original-wordmark' },
  graphql: { nombre: 'GraphQL', icono: 'graphql', variante: 'plain' },
  csharp: { nombre: 'C#', icono: 'csharp' },
  'c#': { nombre: 'C#', icono: 'csharp' },
  'c++': { nombre: 'C++', icono: 'cplusplus' },
  cplusplus: { nombre: 'C++', icono: 'cplusplus' },
  cpp: { nombre: 'C++', icono: 'cplusplus' },
  c: { nombre: 'C', icono: 'c' },
  net: { nombre: '.NET', icono: 'dot-net' },
  dotnet: { nombre: '.NET', icono: 'dot-net' },
  aspnet: { nombre: 'ASP.NET', icono: 'dot-net' },
  kotlin: { nombre: 'Kotlin', icono: 'kotlin' },
  swift: { nombre: 'Swift', icono: 'swift' },
  dart: { nombre: 'Dart', icono: 'dart' },
  flutter: { nombre: 'Flutter', icono: 'flutter' },
  android: { nombre: 'Android', icono: 'android' },
  rust: { nombre: 'Rust', icono: 'rust' },
  ruby: { nombre: 'Ruby', icono: 'ruby' },
  rails: { nombre: 'Ruby on Rails', icono: 'rails', variante: 'plain' },
  rubyonrails: { nombre: 'Ruby on Rails', icono: 'rails', variante: 'plain' },
  r: { nombre: 'R', icono: 'r' },
  laravel: { nombre: 'Laravel', icono: 'laravel' },
  django: { nombre: 'Django', icono: 'django', variante: 'plain' },
  flask: { nombre: 'Flask', icono: 'flask' },
  fastapi: { nombre: 'FastAPI', icono: 'fastapi' },
  spring: { nombre: 'Spring', icono: 'spring' },
  springboot: { nombre: 'Spring Boot', icono: 'spring' },
  pandas: { nombre: 'pandas', icono: 'pandas' },
  numpy: { nombre: 'NumPy', icono: 'numpy' },
  tensorflow: { nombre: 'TensorFlow', icono: 'tensorflow' },
  jupyter: { nombre: 'Jupyter', icono: 'jupyter' },
  matlab: { nombre: 'MATLAB', icono: 'matlab' },
  unity: { nombre: 'Unity', icono: 'unity' },
  godot: { nombre: 'Godot', icono: 'godot' },
  arduino: { nombre: 'Arduino', icono: 'arduino' },
  aws: { nombre: 'AWS', icono: 'amazonwebservices', variante: 'original-wordmark' },
  amazonwebservices: { nombre: 'AWS', icono: 'amazonwebservices', variante: 'original-wordmark' },
  azure: { nombre: 'Azure', icono: 'azure' },
  gcp: { nombre: 'Google Cloud', icono: 'googlecloud' },
  googlecloud: { nombre: 'Google Cloud', icono: 'googlecloud' },
  vercel: { nombre: 'Vercel', icono: 'vercel' },
  figma: { nombre: 'Figma', icono: 'figma' },
  postman: { nombre: 'Postman', icono: 'postman' },
  jira: { nombre: 'Jira', icono: 'jira' },
  trello: { nombre: 'Trello', icono: 'trello' },
  vscode: { nombre: 'VS Code', icono: 'vscode' },
  visualstudiocode: { nombre: 'VS Code', icono: 'vscode' },
  wordpress: { nombre: 'WordPress', icono: 'wordpress' },
  jest: { nombre: 'Jest', icono: 'jest', variante: 'plain' },
  junit: { nombre: 'JUnit', icono: 'junit' },
  pytest: { nombre: 'pytest', icono: 'pytest' },
  selenium: { nombre: 'Selenium', icono: 'selenium' },
  cypress: { nombre: 'Cypress', icono: 'cypressio' },
  playwright: { nombre: 'Playwright', icono: 'playwright' },
  electron: { nombre: 'Electron', icono: 'electron' },
  ionic: { nombre: 'Ionic', icono: 'ionic' },
  threejs: { nombre: 'Three.js', icono: 'threejs' },
  socketio: { nombre: 'Socket.IO', icono: 'socketio' },
  webpack: { nombre: 'webpack', icono: 'webpack' },
  prisma: { nombre: 'Prisma', icono: 'prisma' },
  markdown: { nombre: 'Markdown', icono: 'markdown' },
  json: { nombre: 'JSON', icono: 'json' },
  yaml: { nombre: 'YAML', icono: 'yaml' },
};

function clave(nombre: string): string {
  return nombre.toLowerCase().replace(/[\s.\-_]/g, '');
}

export interface InfoTecnologia {
  nombre: string;
  logo: string | null;
}

/** Nombre bien escrito y URL del logo (o null si Devicon no lo tiene). */
export function tecnologia(nombre: string): InfoTecnologia {
  const t = TECNOLOGIAS[clave(nombre)];
  if (!t) {
    const limpio = nombre.trim();
    return { nombre: limpio.charAt(0).toUpperCase() + limpio.slice(1), logo: null };
  }
  const logo = t.icono
    ? `https://cdn.jsdelivr.net/npm/devicon@${VERSION_DEVICON}/icons/${t.icono}/${t.icono}-${t.variante ?? 'original'}.svg`
    : null;
  return { nombre: t.nombre, logo };
}
