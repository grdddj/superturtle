import React, { useEffect, useMemo, useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@material-ui/core";
import { fade, makeStyles } from "@material-ui/core/styles";
import BusinessIcon from "@material-ui/icons/Business";
import { api } from "../../convex/_generated/api";

const INDUSTRY_OPTIONS = [
  "Technology",
  "Financial Services",
  "Healthcare",
  "Education",
  "Retail",
  "Manufacturing",
  "Consulting",
  "Media",
  "Real Estate",
  "Transportation",
  "Government",
  "Nonprofit",
  "Other",
];

const SIZE_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_COMPANY_DESCRIPTION = "No company description provided yet.";

const useStyles = makeStyles((theme) => ({
  page: {
    width: "100%",
    padding: theme.spacing(1, 0, 3),
  },
  card: {
    width: "100%",
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
  },
  title: {
    fontWeight: 700,
    color: theme.palette.primary.main,
  },
  subtitle: {
    color: theme.palette.text.secondary,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5),
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.5),
    borderRadius: 10,
    border: `1px dashed ${fade(theme.palette.primary.main, 0.4)}`,
    backgroundColor: fade(theme.palette.primary.main, 0.04),
  },
  logoPreview: {
    width: 52,
    height: 52,
    backgroundColor: fade(theme.palette.primary.main, 0.15),
    color: theme.palette.primary.main,
  },
  logoMeta: {
    flex: 1,
    minWidth: 0,
  },
  logoName: {
    fontWeight: 600,
    color: theme.palette.text.primary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  logoHelper: {
    fontSize: "0.78rem",
    color: theme.palette.text.secondary,
    marginTop: 2,
  },
  footer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  errorText: {
    color: theme.palette.error.main,
    fontWeight: 500,
  },
  successText: {
    color: theme.palette.primary.main,
    fontWeight: 500,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  createButton: {
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    fontWeight: 700,
    textTransform: "none",
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
    },
    "&.Mui-disabled": {
      color: "rgba(255,255,255,0.7)",
      backgroundColor: fade(theme.palette.primary.main, 0.55),
    },
  },
  inlineLoader: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
}));

const slugifyCompanyName = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeWebsite = (value) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const CreateCompany = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const { isAuthenticated } = useConvexAuth();
  const createCompany = useMutation(api.companies.createCompany);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewURL, setLogoPreviewURL] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewURL("");
      return undefined;
    }

    const nextPreviewURL = URL.createObjectURL(logoFile);
    setLogoPreviewURL(nextPreviewURL);

    return () => {
      URL.revokeObjectURL(nextPreviewURL);
    };
  }, [logoFile]);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const trimmedDescription = useMemo(() => description.trim(), [description]);
  const canSubmit = Boolean(isAuthenticated && trimmedName && industry && size && !isSubmitting);

  const resetForm = () => {
    setName("");
    setIndustry("");
    setSize("");
    setDescription("");
    setWebsite("");
    setLogoFile(null);
  };

  const handleLogoChange = (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setFormError("Please choose an image file for the company logo.");
      return;
    }

    if (selectedFile.size > MAX_LOGO_SIZE_BYTES) {
      setFormError("Logo image must be 5MB or smaller.");
      return;
    }

    setFormError("");
    setSuccessMessage("");
    setLogoFile(selectedFile);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      setFormError("Sign in to create a company.");
      return;
    }

    if (!trimmedName || !industry || !size) {
      setFormError("Name, industry, and company size are required.");
      return;
    }

    const generatedSlug = slugifyCompanyName(trimmedName);
    if (!generatedSlug) {
      setFormError("Company name must include at least one letter or number.");
      return;
    }

    setFormError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      let logoStorageId;

      if (logoFile) {
        const uploadUrl = await generateUploadUrl({});
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": logoFile.type || "application/octet-stream",
          },
          body: logoFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("Logo upload failed");
        }

        const uploadResult = await uploadResponse.json();
        if (!uploadResult.storageId) {
          throw new Error("Missing uploaded logo storage ID");
        }

        logoStorageId = uploadResult.storageId;
      }

      await createCompany({
        name: trimmedName,
        slug: generatedSlug,
        industry,
        size,
        description: trimmedDescription || DEFAULT_COMPANY_DESCRIPTION,
        website: normalizeWebsite(website),
        logoStorageId,
      });

      setSuccessMessage("Company created successfully.");
      resetForm();
      navigate(`/company/${encodeURIComponent(generatedSlug)}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to create company.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={classes.page}>
      <Paper elevation={0} className={classes.card}>
        <Typography variant="h5" className={classes.title}>
          Create a company
        </Typography>
        <Typography variant="body2" className={classes.subtitle}>
          Build your company presence and start sharing updates with your network.
        </Typography>

        <form className={classes.form} onSubmit={handleSubmit}>
          <TextField
            label="Company name"
            variant="outlined"
            fullWidth
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />

          <TextField
            select
            label="Industry"
            variant="outlined"
            fullWidth
            required
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
          >
            {INDUSTRY_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Company size"
            variant="outlined"
            fullWidth
            required
            value={size}
            onChange={(event) => setSize(event.target.value)}
          >
            {SIZE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Description"
            variant="outlined"
            fullWidth
            multiline
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What does your company do?"
          />

          <TextField
            label="Website (optional)"
            variant="outlined"
            fullWidth
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            placeholder="example.com"
          />

          <div className={classes.logoRow}>
            <Avatar className={classes.logoPreview} src={logoPreviewURL || undefined}>
              {!logoPreviewURL ? <BusinessIcon /> : null}
            </Avatar>
            <div className={classes.logoMeta}>
              <Typography className={classes.logoName}>
                {logoFile ? logoFile.name : "No logo selected"}
              </Typography>
              <Typography className={classes.logoHelper}>PNG/JPG, up to 5MB</Typography>
            </div>
            <Button variant="outlined" component="label">
              {logoFile ? "Change logo" : "Upload logo"}
              <input type="file" accept="image/*" hidden onChange={handleLogoChange} />
            </Button>
          </div>

          {formError ? (
            <Typography variant="body2" className={classes.errorText}>
              {formError}
            </Typography>
          ) : null}

          {successMessage ? (
            <Typography variant="body2" className={classes.successText}>
              {successMessage}
            </Typography>
          ) : null}

          <div className={classes.footer}>
            <Typography variant="body2" className={classes.subtitle}>
              Slug preview: {trimmedName ? slugifyCompanyName(trimmedName) || "invalid-name" : "company-slug"}
            </Typography>
            <div className={classes.actions}>
              <Button onClick={() => navigate(-1)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                className={classes.createButton}
                disabled={!canSubmit}
              >
                {isSubmitting ? (
                  <span className={classes.inlineLoader}>
                    <CircularProgress size={16} color="inherit" thickness={5} />
                    Creating...
                  </span>
                ) : (
                  "Create company"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Paper>
    </div>
  );
};

export default CreateCompany;
