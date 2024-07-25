import { RadioGroupField, Radio } from "@aws-amplify/ui-react";
import { useState, SetStateAction, useEffect } from "react";
import { AuthMode } from "./HarnessContext";

type OverrideAuthMode = AuthMode | 'unset';

type AuthModePickerProps = {
  initialAuthMode?: OverrideAuthMode;
  onAuthModeUpdates: (updatedAuthMode?: AuthMode) => void;
};

export const AuthModePicker = ({ initialAuthMode, onAuthModeUpdates }: AuthModePickerProps) => {
  const [overrideAuthMode, setOverrideAuthMode] = useState<OverrideAuthMode>(initialAuthMode ?? 'unset');

  useEffect(() => {
    onAuthModeUpdates(overrideAuthMode === 'unset' ? undefined : overrideAuthMode);
  }, [overrideAuthMode, onAuthModeUpdates]);
  
  return (
    <RadioGroupField
      label="Auth Type Override"
      name="authTypeOverride"
      value={overrideAuthMode}
      onChange={(e) => setOverrideAuthMode(e.target.value as unknown as SetStateAction<OverrideAuthMode>)}
    >
      <Radio value='unset' crossOrigin={undefined}>Not Set</Radio>
      <Radio value='API_KEY' crossOrigin={undefined}>API Key</Radio>
      <Radio value='AMAZON_COGNITO_USER_POOLS' crossOrigin={undefined}>User Pool</Radio>
    </RadioGroupField>
  );
};
