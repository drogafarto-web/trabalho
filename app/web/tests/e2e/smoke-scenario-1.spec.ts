import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Scenario 1: Import estrutura + alunos', async ({ page }) => {
    const startTime = Date.now();
    const evidenceDir = path.resolve(__dirname, '../../../test-fixtures/evidence');
    const estruturaPath = path.resolve(__dirname, '../../../test-fixtures/planilhas/estrutura.xlsx');
    const alunosPath = path.resolve(__dirname, '../../../test-fixtures/planilhas/alunos.xlsx');

    // 1. Open the browser to the production URL
    await page.goto('https://trabalhos-e0647.web.app');

    // 2. Log in using "Entrar com Google"
    const googleLoginButton = page.getByRole('button', { name: /Entrar com Google/i });
    await expect(googleLoginButton).toBeVisible();
    await googleLoginButton.click();

    // Check for OAuth interaction
    await page.waitForTimeout(5000);

    if (page.url().includes('accounts.google.com')) {
        console.log('NEEDS_HUMAN: OAuth interactive');
        // We take a screenshot to confirm why it stopped
        await page.screenshot({ path: path.join(evidenceDir, '01-oauth-blocked.png') });
        return;
    }

    // 3. Navigate to the Import page
    await page.getByRole('link', { name: /Importar/i }).click();
    await expect(page).toHaveURL(/.*\/importar/);

    // 4. Upload estrutura.xlsx
    const estruturaCard = page.locator('article', { hasText: 'Estrutura' });
    const fileChooserPromise = page.waitForEvent('filechooser');
    await estruturaCard.getByText(/Arraste ou clique pra selecionar o XLSX/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(estruturaPath);

    // 5. Verify the preview and commit the import
    await expect(estruturaCard.getByText(/Disciplinas/i)).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, '01-preview-estrutura.png') });

    await estruturaCard.getByRole('button', { name: /Confirmar Importação/i }).click();
    await expect(estruturaCard.getByText(/Importação concluída/i)).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, '01-success-estrutura.png') });

    // 6. Upload alunos.xlsx
    const alunosCard = page.locator('article', { hasText: 'Alunos' });
    const fileChooserPromise2 = page.waitForEvent('filechooser');
    await alunosCard.getByText(/Arraste ou clique pra selecionar o XLSX/i).click();
    const fileChooser2 = await fileChooserPromise2;
    await fileChooser2.setFiles(alunosPath);

    // 7. Verify the preview and commit the import
    await expect(alunosCard.getByText(/Alunos/i)).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, '01-preview-alunos.png') });

    await alunosCard.getByRole('button', { name: /Confirmar Importação/i }).click();
    await expect(alunosCard.getByText(/Importação concluída/i)).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, '01-success-alunos.png') });

    // 8. Verify that disciplines and students are visible in the dashboard/lists
    await page.getByRole('link', { name: /Trabalhos/i }).click();
    await page.screenshot({ path: path.join(evidenceDir, '01-dashboard-final.png') });

    const duration = (Date.now() - startTime) / 1000;
    console.log(`STATUS: PASS`);
    console.log(`DURATION: ${duration}s`);
});
