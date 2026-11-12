import { useState } from "react";
import { useRouter, type Href } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Image, StyleSheet } from "react-native";
import { fieldErrors, uploadFile, type GeoBounds } from "@/lib/api";
import { palette, radii } from "@/lib/theme";
import { blueprintFormSchema, geoBoundsFormSchema } from "@/lib/validation";
import { Button, Screen, ScreenHeader, Stack, Text, TextField, Toggle } from "@/components/ui";
import { FieldNotice, InlineNotice, MutationError } from "@/components/feedback";
import { useBlueprints, useCreateBlueprint } from "../hooks/useBlueprints";

interface PickedImage {
  uri: string;
  width: number;
  height: number;
  contentType: "image/jpeg" | "image/png";
}

const GEO_FIELDS = ["north", "south", "east", "west"] as const;
type GeoField = (typeof GEO_FIELDS)[number];

function parseNumber(text: string): number | null {
  if (text.trim() === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function NewBlueprintScreen() {
  const router = useRouter();
  const existing = useBlueprints();
  const create = useCreateBlueprint();
  const [name, setName] = useState("");
  const [image, setImage] = useState<PickedImage | null>(null);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [geo, setGeo] = useState<Record<GeoField, string>>({
    north: "",
    south: "",
    east: "",
    west: "",
  });
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentDefault = existing.data?.find((item) => item.isDefault);

  const chooseImage = async () => {
    setUploadError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    const type = (asset.mimeType ?? "").toLowerCase();
    if (type !== "image/jpeg" && type !== "image/png") {
      setUploadError("Use a JPEG or PNG floor plan.");
      return;
    }
    setImage({ uri: asset.uri, width: asset.width, height: asset.height, contentType: type });
    setWidth(String(Math.max(1, Math.round(asset.width))));
    setHeight(String(Math.max(1, Math.round(asset.height))));
  };

  const submit = async () => {
    const next: Record<string, string> = {};
    const size = blueprintFormSchema.safeParse({
      name,
      widthPx: parseNumber(width) ?? Number.NaN,
      heightPx: parseNumber(height) ?? Number.NaN,
    });
    if (!size.success) {
      for (const issue of size.error.issues) {
        const key = String(issue.path[0]);
        next[key] ??= key === "name" ? issue.message : "Enter a whole number from 1 to 20,000.";
      }
    }
    const filled = GEO_FIELDS.filter((field) => geo[field].trim() !== "");
    let geoBounds: GeoBounds | undefined;
    if (filled.length > 0) {
      if (filled.length < 4) next.geoBounds = "Fill all four GPS corners, or none.";
      else {
        const parsed = geoBoundsFormSchema.safeParse({
          north: parseNumber(geo.north),
          south: parseNumber(geo.south),
          east: parseNumber(geo.east),
          west: parseNumber(geo.west),
        });
        if (parsed.success) geoBounds = parsed.data;
        else next.geoBounds = parsed.error.issues[0]?.message ?? "Check the GPS corners.";
      }
    }
    setErrors(next);
    if (!size.success || Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const imageKey = image
        ? await uploadFile({ uri: image.uri, kind: "blueprint", contentType: image.contentType })
        : undefined;
      const created = await create.mutateAsync({
        name: size.data.name,
        widthPx: size.data.widthPx,
        heightPx: size.data.heightPx,
        ...(imageKey ? { imageKey } : {}),
        ...(geoBounds ? { geoBounds } : {}),
        isDefault,
      });
      router.replace(`/admin/blueprints/${created.id}` as Href);
    } catch (error) {
      const server = fieldErrors(error);
      const mapped: Record<string, string> = {};
      if (server.name) mapped.name = server.name;
      if ((error as { status?: number }).status === 409) mapped.name = "That name is already used.";
      setErrors(mapped);
      if (!mapped.name) setUploadError(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen testID="new-blueprint-screen">
      <ScreenHeader
        title="New blueprint"
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/admin/blueprints"))}
      />
      <Stack gap={4}>
        <TextField
          label="Name"
          required
          value={name}
          onChangeText={setName}
          error={errors.name}
          maxLength={120}
          testID="blueprint-name"
        />
        <Stack gap={2}>
          <Text variant="label">Floor-plan image (optional)</Text>
          {image ? (
            <Image
              source={{ uri: image.uri }}
              style={styles.preview}
              accessibilityLabel="Selected floor plan"
              resizeMode="contain"
            />
          ) : null}
          <Button
            label={image ? "Choose a different image" : "Choose image"}
            variant="secondary"
            size="desk"
            onPress={() => void chooseImage()}
          />
          <FieldNotice message={uploadError} />
        </Stack>
        <TextField
          label="Width (px)"
          required
          value={width}
          onChangeText={setWidth}
          keyboardType="numeric"
          error={errors.widthPx}
          helper={image ? "Set from the image: pins and areas use these pixels." : undefined}
          testID="blueprint-width"
        />
        <TextField
          label="Height (px)"
          required
          value={height}
          onChangeText={setHeight}
          keyboardType="numeric"
          error={errors.heightPx}
          testID="blueprint-height"
        />
        <Stack gap={2}>
          <Text variant="label">GPS corners (optional)</Text>
          <Text variant="caption" tone="muted">
            The GPS corners of a north-up floor plan. Needed for automatic pins from phone GPS.
          </Text>
          {GEO_FIELDS.map((field) => (
            <TextField
              key={field}
              label={field[0]?.toUpperCase() + field.slice(1)}
              value={geo[field]}
              onChangeText={(value) => setGeo((previous) => ({ ...previous, [field]: value }))}
              keyboardType="numeric"
              testID={`geo-${field}`}
            />
          ))}
          <FieldNotice message={errors.geoBounds} />
        </Stack>
        <Toggle
          label="Default blueprint"
          value={isDefault}
          onChange={setIsDefault}
          testID="blueprint-default"
        />
        {isDefault && currentDefault ? (
          <InlineNotice
            message={`This replaces ${currentDefault.name} as the plan used for automatic pins.`}
          />
        ) : null}
        <MutationError error={create.error} />
        <Button
          label="Save blueprint"
          loading={saving}
          onPress={() => void submit()}
          testID="save-blueprint"
        />
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: "100%",
    height: 200,
    borderRadius: radii.card,
    backgroundColor: palette.grey200,
  },
});
