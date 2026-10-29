import api from "./api";

/**
 * importService.js — /api/v1/imports (admin)
 *
 *   GET  /imports/templates                 importable types + column docs
 *   GET  /imports/templates/:type.csv       sample CSV (courses | curriculum | quizzes)
 *   POST /imports/:type                     { csv, dry_run, create_missing_categories }
 *   GET  /imports/standard                  bundled AWS / Azure course packs
 *   POST /imports/standard/:packId          import a pack (draft courses)
 *
 * Validation errors come back as HTTP 422 with
 *   { message, errors: [{ row, column, message }] }
 */

const importService = {
    getTemplates: () => api.get("/imports/templates"),

    /** Download the sample CSV through the authenticated API and save it. */
    async downloadTemplate(type) {
        const { data } = await api.get(`/imports/templates/${type}.csv`, { responseType: "blob" });
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = `certezy-${type}-sample.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    runImport: (type, { csv, dryRun = false, createMissingCategories = true }) =>
        api.post(`/imports/${type}`, {
            csv,
            dry_run: dryRun,
            create_missing_categories: createMissingCategories,
        }),

    getStandardPacks: () => api.get("/imports/standard"),
    importStandardPack: (packId) => api.post(`/imports/standard/${packId}`, {}),
};

export default importService;
