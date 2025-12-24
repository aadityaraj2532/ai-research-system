/**
 * Property-Based Test for Project Structure
 * Tests Property 34: Separation of Concerns
 * Validates: Requirements 10.4
 */

import { promises as fs } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDir = join(__dirname, '..');

/**
 * Property 34: Separation of Concerns
 * For any application code, the system should maintain proper separation 
 * between HTML, CSS, and JavaScript files.
 */
class ProjectStructureTest {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }
    
    /**
     * Run all structure tests
     */
    async runTests() {
        console.log('🧪 Testing Property 34: Separation of Concerns');
        console.log('📋 Validates: Requirements 10.4\n');
        
        try {
            await this.testDirectoryStructure();
            await this.testFileExtensions();
            await this.testContentSeparation();
            await this.testImportStructure();
            
            this.printResults();
            return this.results.failed === 0;
            
        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            return false;
        }
    }
    
    /**
     * Test that proper directory structure exists
     */
    async testDirectoryStructure() {
        console.log('🔍 Testing directory structure...');
        
        const expectedDirs = ['css', 'js', 'test'];
        const expectedFiles = ['index.html'];
        
        // Check directories
        for (const dir of expectedDirs) {
            const dirPath = join(frontendDir, dir);
            try {
                const stat = await fs.stat(dirPath);
                if (stat.isDirectory()) {
                    this.pass(`Directory '${dir}' exists`);
                } else {
                    this.fail(`'${dir}' exists but is not a directory`);
                }
            } catch (error) {
                this.fail(`Directory '${dir}' does not exist`);
            }
        }
        
        // Check main files
        for (const file of expectedFiles) {
            const filePath = join(frontendDir, file);
            try {
                const stat = await fs.stat(filePath);
                if (stat.isFile()) {
                    this.pass(`File '${file}' exists`);
                } else {
                    this.fail(`'${file}' exists but is not a file`);
                }
            } catch (error) {
                this.fail(`File '${file}' does not exist`);
            }
        }
    }
    
    /**
     * Test that files have correct extensions and are in correct directories
     */
    async testFileExtensions() {
        console.log('🔍 Testing file extensions and locations...');
        
        const rules = [
            { dir: 'css', extensions: ['.css'], description: 'CSS files in css directory' },
            { dir: 'js', extensions: ['.js'], description: 'JavaScript files in js directory' },
            { dir: '.', extensions: ['.html'], description: 'HTML files in root directory' }
        ];
        
        for (const rule of rules) {
            const dirPath = rule.dir === '.' ? frontendDir : join(frontendDir, rule.dir);
            
            try {
                const files = await fs.readdir(dirPath);
                const relevantFiles = files.filter(file => {
                    const ext = extname(file);
                    return rule.extensions.includes(ext);
                });
                
                if (relevantFiles.length > 0) {
                    this.pass(`${rule.description}: found ${relevantFiles.length} files`);
                    
                    // Verify no wrong file types in directory (allow package.json in root)
                    const wrongFiles = files.filter(file => {
                        const ext = extname(file);
                        const isAllowedConfig = rule.dir === '.' && (file === 'package.json' || file === 'README.md');
                        return ext && !rule.extensions.includes(ext) && !file.startsWith('.') && !isAllowedConfig;
                    });
                    
                    if (wrongFiles.length === 0) {
                        this.pass(`No incorrect file types in ${rule.dir} directory`);
                    } else {
                        this.fail(`Incorrect file types in ${rule.dir}: ${wrongFiles.join(', ')}`);
                    }
                } else {
                    this.fail(`No ${rule.description} found`);
                }
            } catch (error) {
                this.fail(`Could not read ${rule.dir} directory: ${error.message}`);
            }
        }
    }
    
    /**
     * Test that content is properly separated (no inline styles/scripts in HTML)
     */
    async testContentSeparation() {
        console.log('🔍 Testing content separation...');
        
        try {
            const htmlPath = join(frontendDir, 'index.html');
            const htmlContent = await fs.readFile(htmlPath, 'utf8');
            
            // Check for inline styles
            const inlineStyleRegex = /style\s*=\s*["'][^"']*["']/gi;
            const inlineStyles = htmlContent.match(inlineStyleRegex);
            
            if (!inlineStyles || inlineStyles.length === 0) {
                this.pass('No inline styles found in HTML');
            } else {
                // Allow some inline styles for specific cases (like z-index for positioning)
                const allowedInlineStyles = inlineStyles.filter(style => 
                    style.includes('z-index') || style.includes('position')
                );
                
                if (inlineStyles.length === allowedInlineStyles.length) {
                    this.pass('Only allowed inline styles found in HTML');
                } else {
                    this.fail(`Inappropriate inline styles found: ${inlineStyles.length - allowedInlineStyles.length}`);
                }
            }
            
            // Check for inline scripts (excluding external script tags)
            const inlineScriptRegex = /<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/gi;
            const inlineScripts = htmlContent.match(inlineScriptRegex);
            
            if (!inlineScripts || inlineScripts.length === 0) {
                this.pass('No inline scripts found in HTML');
            } else {
                this.fail(`Inline scripts found in HTML: ${inlineScripts.length}`);
            }
            
            // Check for external CSS and JS references
            const cssLinkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*>/gi;
            const jsScriptRegex = /<script[^>]*src=[^>]*><\/script>/gi;
            
            const cssLinks = htmlContent.match(cssLinkRegex);
            const jsScripts = htmlContent.match(jsScriptRegex);
            
            if (cssLinks && cssLinks.length > 0) {
                this.pass(`External CSS references found: ${cssLinks.length}`);
            } else {
                this.fail('No external CSS references found');
            }
            
            if (jsScripts && jsScripts.length > 0) {
                this.pass(`External JS references found: ${jsScripts.length}`);
            } else {
                this.fail('No external JS references found');
            }
            
        } catch (error) {
            this.fail(`Could not test content separation: ${error.message}`);
        }
    }
    
    /**
     * Test that JavaScript modules use proper import/export structure
     */
    async testImportStructure() {
        console.log('🔍 Testing JavaScript module structure...');
        
        try {
            const jsDir = join(frontendDir, 'js');
            const jsFiles = await fs.readdir(jsDir);
            const moduleFiles = jsFiles.filter(file => extname(file) === '.js');
            
            for (const file of moduleFiles) {
                const filePath = join(jsDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                
                // Check for ES6 module syntax
                const hasImport = /^import\s+/m.test(content);
                const hasExport = /^export\s+/m.test(content);
                
                if (file === 'app.js') {
                    // Main app file should have imports
                    if (hasImport) {
                        this.pass(`${file} uses ES6 imports`);
                    } else {
                        this.fail(`${file} should use ES6 imports`);
                    }
                } else {
                    // Other modules should have exports
                    if (hasExport) {
                        this.pass(`${file} uses ES6 exports`);
                    } else {
                        this.fail(`${file} should use ES6 exports`);
                    }
                }
                
                // Check for proper class/function organization
                const hasClass = /^export\s+class\s+\w+|^class\s+\w+/m.test(content);
                const hasFunction = /^(export\s+)?(async\s+)?function\s+\w+/m.test(content);
                const hasExportedFunction = /^export\s+(async\s+)?function\s+\w+/m.test(content);
                const hasExportedClass = /^export\s+class\s+\w+/m.test(content);
                
                if (hasClass || hasFunction || hasExportedFunction || hasExportedClass) {
                    this.pass(`${file} has proper code organization`);
                } else {
                    this.fail(`${file} lacks proper code organization`);
                }
            }
            
        } catch (error) {
            this.fail(`Could not test import structure: ${error.message}`);
        }
    }
    
    /**
     * Record a passing test
     */
    pass(message) {
        this.results.passed++;
        console.log(`  ✅ ${message}`);
    }
    
    /**
     * Record a failing test
     */
    fail(message) {
        this.results.failed++;
        this.results.errors.push(message);
        console.log(`  ❌ ${message}`);
    }
    
    /**
     * Print test results
     */
    printResults() {
        console.log('\n📊 Test Results:');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        
        if (this.results.failed > 0) {
            console.log('\n🔍 Failures:');
            this.results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }
        
        const success = this.results.failed === 0;
        console.log(`\n🎯 Property 34 (Separation of Concerns): ${success ? 'PASSED' : 'FAILED'}`);
        
        return success;
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const test = new ProjectStructureTest();
    const success = await test.runTests();
    process.exit(success ? 0 : 1);
}

export { ProjectStructureTest };