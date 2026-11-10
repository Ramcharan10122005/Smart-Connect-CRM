import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const CRM_FIELDS = [
  { key: 'firstName', label: 'First Name *', required: true },
  { key: 'lastName', label: 'Last Name *', required: true },
  { key: 'email', label: 'Email Address' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'jobTitle', label: 'Job Title' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'lifecycleStage', label: 'Lifecycle Stage (PROSPECT/CUSTOMER/INACTIVE)' },
  { key: 'addressLine1', label: 'Address Line 1' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State / Province' },
  { key: 'country', label: 'Country' },
  { key: 'postalCode', label: 'Postal Code' },
  { key: 'notes', label: 'Notes' },
];

export function CsvImportWizardDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  // Steps: 1: Upload, 2: Map Columns, 3: Preview & Validate, 4: Confirm, 5: Summary
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Preview Data from Server
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [sampleRows, setSampleRows] = useState([]);
  const [allParsedRows, setAllParsedRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);

  // Final Import Result
  const [importResult, setImportResult] = useState(null);

  const resetWizard = () => {
    setStep(1);
    setFile(null);
    setDetectedColumns([]);
    setColumnMapping({});
    setSampleRows([]);
    setAllParsedRows([]);
    setTotalRows(0);
    setValidationErrors([]);
    setImportResult(null);
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  // Preview mutation (Step 1 -> 2)
  const previewMutation = useMutation({
    mutationFn: async (selectedFile) => {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await api.post('/contacts/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data?.data;
    },
    onSuccess: (data) => {
      setDetectedColumns(data.detectedColumns || []);
      setColumnMapping(data.mappingSuggestion || {});
      setSampleRows(data.sampleRows || []);
      setTotalRows(data.totalRows || 0);
      setValidationErrors(data.validationErrors || []);
      setStep(2);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to parse CSV file');
    },
  });

  // Client-side row parsing for commit payload
  const parseAllRowsFromCsv = async (fileObj) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length < 2) return resolve([]);

          // Simple CSV line splitter that handles quoted commas
          const parseLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  current += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          };

          const headers = parseLine(lines[0]);
          const parsed = [];
          for (let i = 1; i < lines.length; i++) {
            const values = parseLine(lines[i]);
            const rowObj = {};
            headers.forEach((h, idx) => {
              rowObj[h] = values[idx] || '';
            });
            parsed.push(rowObj);
          }
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(fileObj);
    });
  };

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a valid CSV file (.csv)');
      return;
    }
    setFile(selectedFile);
    try {
      const allRows = await parseAllRowsFromCsv(selectedFile);
      setAllParsedRows(allRows);
    } catch {
      // ignore
    }
    previewMutation.mutate(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'First Name,Last Name,Email,Phone,Job Title,Company,Lifecycle Stage,City,Country\n' +
      'Sarah,Connor,sarah.connor@example.com,+1 415-555-0142,Operations Lead,Cyberdyne Systems,PROSPECT,Los Angeles,USA\n' +
      'Marcus,Wright,marcus.wright@example.com,+1 212-555-0188,Chief Architect,Skynet Labs,CUSTOMER,New York,USA\n' +
      'Kyle,Reese,kyle.reese@example.com,+1 312-555-0199,Security Officer,Resistance Inc,PROSPECT,Chicago,USA\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'smartconnect_contacts_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded sample CSV template');
  };

  // Commit mutation (Step 4 -> 5)
  const commitMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/contacts/import/commit', {
        mapping: columnMapping,
        rows: allParsedRows.length > 0 ? allParsedRows : sampleRows,
      });
      return res.data?.data;
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setStep(5);
      toast.success(`Successfully imported ${data.created || 0} contacts!`);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to complete contact import');
    },
  });

  const isMappingValid = () => {
    const mappedValues = Object.values(columnMapping);
    const hasFirstName = mappedValues.includes('firstName');
    const hasLastName = mappedValues.includes('lastName');
    return hasFirstName && hasLastName;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        {/* Header with Step Indicator */}
        <div className="p-6 border-b bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center justify-between">
              <span>Import Contacts via CSV</span>
              <Badge variant="outline" className="text-xs font-normal">
                Step {step} of 5
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Bulk import contact profiles into your database with automated field mapping and duplicate email checking.
            </DialogDescription>
          </DialogHeader>

          {/* Stepper bar */}
          <div className="grid grid-cols-5 gap-2 mt-4 pt-2">
            {[
              { num: 1, label: 'Upload' },
              { num: 2, label: 'Map Columns' },
              { num: 3, label: 'Preview' },
              { num: 4, label: 'Confirm' },
              { num: 5, label: 'Summary' },
            ].map((s) => (
              <div key={s.num} className="text-center">
                <div
                  className={cn(
                    'h-1.5 w-full rounded-full transition-all',
                    step >= s.num ? 'bg-primary' : 'bg-muted'
                  )}
                />
                <span
                  className={cn(
                    'text-[11px] mt-1 block truncate',
                    step === s.num
                      ? 'font-semibold text-primary'
                      : step > s.num
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-card p-10 text-center cursor-pointer transition-colors',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/40'
                )}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                  }}
                />
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                  {previewMutation.isPending ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6" />
                  )}
                </div>
                <h4 className="font-semibold text-sm">
                  {previewMutation.isPending
                    ? 'Analyzing CSV file...'
                    : 'Click to select or drag and drop your CSV file'}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Accepts standard UTF-8 encoded comma-separated files (.csv) up to 10MB.
                </p>
                {file && (
                  <div className="inline-flex items-center gap-2 mt-4 px-3 py-1 bg-muted rounded-full text-xs font-medium">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                    <span>{file.name}</span>
                    <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>

              {/* Sample template download card */}
              <div className="rounded-card border bg-muted/30 p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h5 className="text-xs font-semibold">Need a template?</h5>
                  <p className="text-xs text-muted-foreground">
                    Download our pre-formatted sample CSV with standard columns.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSampleCsv}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download Template
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: MAP COLUMNS */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h4 className="font-semibold text-sm">Match CSV Columns to Contact Fields</h4>
                  <p className="text-xs text-muted-foreground">
                    Found {detectedColumns.length} columns in CSV. First Name and Last Name are required.
                  </p>
                </div>
                {!isMappingValid() && (
                  <Badge variant="destructive" className="text-xs">
                    First Name & Last Name required
                  </Badge>
                )}
              </div>

              <div className="border rounded-card divide-y max-h-96 overflow-y-auto">
                {detectedColumns.map((colName) => (
                  <div key={colName} className="p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 max-w-[200px] truncate">
                      <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate" title={colName}>
                        {colName}
                      </span>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

                    <div className="w-[280px]">
                      <Select
                        value={columnMapping[colName] || '__ignore__'}
                        onValueChange={(val) => {
                          setColumnMapping((prev) => ({
                            ...prev,
                            [colName]: val === '__ignore__' ? null : val,
                          }));
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-crm">
                          <SelectValue placeholder="Do not import" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__ignore__" className="text-muted-foreground italic text-xs">
                            (Ignore this column)
                          </SelectItem>
                          {CRM_FIELDS.map((f) => (
                            <SelectItem key={f.key} value={f.key} className="text-xs">
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & VALIDATION */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">Data Preview & Validation Check</h4>
                  <p className="text-xs text-muted-foreground">
                    Previewing first {sampleRows.length} of {totalRows} records from your file.
                  </p>
                </div>
                {validationErrors.length > 0 ? (
                  <Badge variant="destructive" className="text-xs flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {validationErrors.length} Issue{validationErrors.length > 1 ? 's' : ''} Detected
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-xs flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> No syntax errors found
                  </Badge>
                )}
              </div>

              {/* Validation errors warning box */}
              {validationErrors.length > 0 && (
                <div className="rounded-card border border-destructive/30 bg-destructive/5 p-3 space-y-1.5 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Rows with validation errors will be skipped or need attention:
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
                    {validationErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>
                        Row {err.rowNumber}: <span className="font-medium text-destructive">{err.error}</span>
                      </li>
                    ))}
                    {validationErrors.length > 5 && (
                      <li className="italic text-muted-foreground">
                        ...and {validationErrors.length - 5} more issues.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div className="border rounded-card overflow-x-auto max-h-64">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b font-medium text-muted-foreground">
                    <tr>
                      <th className="p-2.5">Row</th>
                      {CRM_FIELDS.filter((f) => Object.values(columnMapping).includes(f.key)).map(
                        (f) => (
                          <th key={f.key} className="p-2.5 whitespace-nowrap">
                            {f.label.replace(' *', '')}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sampleRows.map((row, idx) => {
                      const rowNum = idx + 1;
                      const hasError = validationErrors.some((e) => e.rowNumber === rowNum);
                      return (
                        <tr
                          key={idx}
                          className={cn(
                            'hover:bg-muted/30 transition-colors',
                            hasError && 'bg-destructive/5'
                          )}
                        >
                          <td className="p-2.5 font-mono text-muted-foreground">{rowNum}</td>
                          {CRM_FIELDS.filter((f) =>
                            Object.values(columnMapping).includes(f.key)
                          ).map((f) => {
                            const headerCol = Object.keys(columnMapping).find(
                              (h) => columnMapping[h] === f.key
                            );
                            const val = headerCol ? row[headerCol] : '';
                            return (
                              <td key={f.key} className="p-2.5 max-w-[180px] truncate" title={val}>
                                {val || <span className="text-muted-foreground/50">-</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIRM */}
          {step === 4 && (
            <div className="space-y-5 text-center py-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <FileSpreadsheet className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-semibold">Ready to Import {totalRows} Contacts</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Clicking &quot;Start Import&quot; will create contact profiles in SmartConnect CRM according to your column mapping.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
                <div className="border rounded-card p-3 bg-card">
                  <div className="text-lg font-bold">{totalRows}</div>
                  <div className="text-[11px] text-muted-foreground">Total Rows</div>
                </div>
                <div className="border rounded-card p-3 bg-card">
                  <div className="text-lg font-bold text-primary">
                    {Object.values(columnMapping).filter(Boolean).length}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Mapped Columns</div>
                </div>
                <div className="border rounded-card p-3 bg-card">
                  <div className="text-lg font-bold text-amber-600">
                    {validationErrors.length}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Warnings</div>
                </div>
              </div>

              <div className="rounded-card border bg-muted/20 p-3 max-w-lg mx-auto text-xs text-muted-foreground text-left">
                <p className="font-medium text-foreground mb-0.5">Duplicate Policy</p>
                Contacts with email addresses that already exist in your system will be safely skipped to avoid duplicate data.
              </div>
            </div>
          )}

          {/* STEP 5: SUMMARY */}
          {step === 5 && importResult && (
            <div className="space-y-5 text-center py-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Check className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-semibold">Import Complete!</h4>
                <p className="text-xs text-muted-foreground">
                  Your contacts have been processed and added to the directory.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
                <div className="border rounded-card p-3 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {importResult.created || 0}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Successfully Created</div>
                </div>
                <div className="border rounded-card p-3 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <div className="text-xl font-bold text-amber-700 dark:text-amber-300">
                    {importResult.skipped || 0}
                  </div>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400">Skipped (Duplicate)</div>
                </div>
                <div className="border rounded-card p-3 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800">
                  <div className="text-xl font-bold text-rose-700 dark:text-rose-300">
                    {importResult.failed || 0}
                  </div>
                  <div className="text-[11px] text-rose-600 dark:text-rose-400">Failed / Errors</div>
                </div>
              </div>

              {importResult.errors?.length > 0 && (
                <div className="border rounded-card p-3 max-w-lg mx-auto text-left text-xs bg-muted/40 max-h-36 overflow-y-auto">
                  <p className="font-semibold text-destructive mb-1">Row Error Details:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                    {importResult.errors.map((e, idx) => (
                      <li key={idx}>
                        Row {e.rowNumber}: {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t bg-card flex items-center justify-between">
          <div>
            {step > 1 && step < 5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
                disabled={commitMutation.isPending}
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 5 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={commitMutation.isPending}
              >
                Cancel
              </Button>
            )}

            {step === 1 && (
              <Button
                type="button"
                size="sm"
                disabled={!file || previewMutation.isPending}
                onClick={() => file && previewMutation.mutate(file)}
              >
                {previewMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    Continue to Mapping <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}

            {step === 2 && (
              <Button
                type="button"
                size="sm"
                disabled={!isMappingValid()}
                onClick={() => setStep(3)}
              >
                Preview Data <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}

            {step === 3 && (
              <Button type="button" size="sm" onClick={() => setStep(4)}>
                Proceed to Confirm <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}

            {step === 4 && (
              <Button
                type="button"
                size="sm"
                onClick={() => commitMutation.mutate()}
                disabled={commitMutation.isPending}
                className="min-w-32"
              >
                {commitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Importing...
                  </>
                ) : (
                  'Start Import'
                )}
              </Button>
            )}

            {step === 5 && (
              <Button type="button" size="sm" onClick={handleClose}>
                Done & View Contacts
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CsvImportWizardDialog;
