const fs = require('fs/promises');
const path = require('path');

/**
 * Recursively reads a directory and returns a tree structure.
 * @param {string} dirPath The path to the directory.
 * @returns {Promise<Object[]>} A promise that resolves to the directory tree.
 */
async function getDirectoryTree(dirPath) {
  const dirents = await fs.readdir(dirPath, { withFileTypes: true });
  const tree = await Promise.all(
    dirents.map(async (dirent) => {
      const fullPath = path.join(dirPath, dirent.name);
      // Path should be relative to the project root (/app), not the server's CWD (/app/server).
      const projectRoot = path.resolve(__dirname, '..');
      const relativePath = path.relative(projectRoot, fullPath);
      if (dirent.isDirectory()) {
        return {
          name: dirent.name,
          type: 'directory',
          path: relativePath,
          children: await getDirectoryTree(fullPath),
        };
      } else {
        return {
          name: dirent.name,
          type: 'file',
          path: relativePath,
        };
      }
    })
  );
  return tree;
}

/**
 * Reads the content of a file.
 * @param {string} filePath The path to the file.
 * @returns {Promise<string>} A promise that resolves to the file content.
 */
async function getFileContent(filePath) {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Saves content to a file.
 * @param {string} filePath The path to the file.
 * @param {string} content The content to save.
 * @returns {Promise<void>} A promise that resolves when the file is saved.
 */
async function saveFileContent(filePath, content) {
  // Ensure the directory exists before writing the file
  const dirname = path.dirname(filePath);
  await fs.mkdir(dirname, { recursive: true });
  return fs.writeFile(filePath, content, 'utf-8');
}

module.exports = {
  getDirectoryTree,
  getFileContent,
  saveFileContent,
};
