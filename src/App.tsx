import { zodResolver } from "@hookform/resolvers/zod";
import { clsx } from "clsx";
import { Clock3, MapPin } from "lucide-react";
import { DateTime } from "luxon";
import { useMemo, useState } from "react";
import { Controller, useForm, type FieldError } from "react-hook-form";
import z from "zod";
import { Button } from "./components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Input } from "./components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";

interface FieldProps {
  label: string;
  description?: string;
  error?: string;
  required: boolean;
  children: React.ReactNode;
  helperText?: string;
}

function Field(props: FieldProps) {
  const { label, description, error, helperText, required, children } = props;
  return (
    <div className="flex flex-col gap-y-2 w-full">
      <div className="flex flex-col">
        <div className="flex flex-row items-center justify-start gap-x-1">
          <div className="w-fit font-normal text-base">{label}</div>
          <div
            className={clsx("w-fit font-normal text-base text-red-500", {
              hidden: !required,
            })}
          >
            *
          </div>
        </div>
        <p className="text-left text-sm text-gray-500">{description}</p>
      </div>
      <div className="flex flex-col gap-y-1.5">
        <div>{children}</div>
        {helperText && (
          <p className="text-left text-sm text-gray-500">{helperText}</p>
        )}
        <div
          className={clsx("w-fit text-xs text-red-500 h-6", {
            visible: !!error,
          })}
        >
          {error}
        </div>
      </div>
    </div>
  );
}

function convertHookFormErrorToFieldError(error?: FieldError) {
  return error?.message || "";
}

const IANA_OPTIONS = Intl.supportedValuesOf("timeZone").reduce((acc, key) => {
  const [country, city] = key.split("/");
  if (!acc[country]) {
    acc[country] = [];
  }

  const now = DateTime.now();
  const zoneTime = now.setZone(key);
  const offsetMinutes = zoneTime.offset;
  const offsetHours = offsetMinutes / 60;
  const offsetSign = offsetHours >= 0 ? "+" : "";
  const offsetString = `${offsetSign}${offsetHours}:${Math.abs(
    offsetMinutes % 60
  )
    .toString()
    .padStart(2, "0")}`;

  acc[country].push({
    label: `${country}/${city} (UTC${offsetString})`,
    value: key,
  });
  return acc;
}, {} as Record<string, Array<{ label: string; value: string }>>);

const IANA_OPTIONS_BY_UTC = Intl.supportedValuesOf("timeZone").reduce(
  (acc, key) => {
    const [country, city] = key.split("/");

    const now = DateTime.now();
    const zoneTime = now.setZone(key);
    const offsetMinutes = zoneTime.offset;
    const offsetHours = offsetMinutes / 60;
    const offsetSign = offsetHours >= 0 ? "+" : "";
    const offsetString = `${offsetSign}${offsetHours}:${Math.abs(
      offsetMinutes % 60
    )
      .toString()
      .padStart(2, "0")}`;

    const utcGroup = `UTC${offsetString}`;

    if (!acc[utcGroup]) {
      acc[utcGroup] = [];
    }

    acc[utcGroup].push({
      label: `${country}/${city} (UTC${offsetString})`,
      value: key,
    });
    return acc;
  },
  {} as Record<string, Array<{ label: string; value: string }>>
);

const schema = z.object({
  timestamp: z
    .number({
      message: "請輸入有效 timestamp，共 13 位數字",
    })
    .min(13, {
      message: "請輸入有效 timestamp，共 13 位數字",
    }),
  timezoneIANA: z.string().min(1, {
    message: "此欄位必須填寫",
  }),
});

enum IANAOptionsGroupType {
  Location = "location",
  UTC = "utc",
}

const DEFAULT_OPTION_GROUP_TYPE = IANAOptionsGroupType.Location;

function App() {
  const form = useForm({
    defaultValues: {
      timestamp: new Date().getTime(),
      timezoneIANA: new Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    mode: "all",
    shouldUnregister: true,
    resolver: zodResolver(schema),
  });
  const { handleSubmit, control, formState } = form;
  const { isValid } = formState;

  const [groupType, setGroupType] = useState(DEFAULT_OPTION_GROUP_TYPE);
  const [result, setResult] = useState<{
    date: string;
    time: string;
  } | null>(null);

  const convert = () => {
    handleSubmit((data) => {
      const luxonDateTime = DateTime.fromMillis(data.timestamp, {
        zone: data.timezoneIANA,
      });
      setResult({
        date: luxonDateTime.toFormat("yyyy-MM-dd"),
        time: luxonDateTime.toFormat("HH:mm:ss"),
      });
    })();
  };

  const options = useMemo(() => {
    if (groupType === IANAOptionsGroupType.Location) {
      return IANA_OPTIONS;
    } else if (groupType === IANAOptionsGroupType.UTC) {
      return IANA_OPTIONS_BY_UTC;
    } else {
      return IANA_OPTIONS;
    }
  }, [groupType]);

  return (
    <Card className="w-full font-mono md:max-w-[500px] max-w-full">
      <CardHeader>
        <CardTitle>時間戳記轉換器</CardTitle>
        <CardDescription>
          將 Unix 時間戳記轉換為指定時區的日期時間格式
        </CardDescription>
        <CardAction>
          <Button
            className={clsx({
              "animate-bounce": isValid,
            })}
            onClick={convert}
          >
            轉換
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Controller
          name="timestamp"
          control={control}
          render={({ field, fieldState }) => (
            <Field
              label="時間戳記"
              description="請輸入 Unix 時間戳記（毫秒）"
              error={convertHookFormErrorToFieldError(fieldState.error)}
              required
              helperText={`當地時間: ${DateTime.fromMillis(
                field.value
              ).toFormat("yyyy-MM-dd HH:mm:ss")} ( ${
                new Intl.DateTimeFormat().resolvedOptions().timeZone
              } )`}
            >
              <Input
                maxLength={13}
                value={field.value.toString()}
                onChange={(e) => {
                  const { value } = e.target;
                  field.onChange(Number(value));
                }}
              />
            </Field>
          )}
        />

        <div className="flex flex-row gap-1 mb-1 justify-end">
          <Button
            onClick={() => {
              setGroupType(IANAOptionsGroupType.Location);
            }}
            size="icon"
            className="size-8"
            variant={
              groupType === IANAOptionsGroupType.Location
                ? "default"
                : "outline"
            }
          >
            <MapPin />
          </Button>
          <Button
            onClick={() => {
              setGroupType(IANAOptionsGroupType.UTC);
            }}
            size="icon"
            className="size-8"
            variant={
              groupType === IANAOptionsGroupType.UTC ? "default" : "outline"
            }
          >
            <Clock3 />
          </Button>
        </div>
        <Controller
          control={control}
          name="timezoneIANA"
          render={({ field, fieldState }) => {
            return (
              <Field
                label="目標轉換時區"
                required={true}
                error={convertHookFormErrorToFieldError(fieldState.error)}
              >
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="請選擇目標轉換時區" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(options).map(
                      ([groupName, options], index) => (
                        <SelectGroup key={index}>
                          <SelectLabel className="font-semibold text-base text-foreground/90 bg-gradient-to-r from-muted/40 to-muted/20 px-3 py-2 rounded-lg border border-border/50 shadow-sm">
                            {groupName}
                          </SelectLabel>
                          {options.map(({ label, value }, index) => (
                            <SelectItem
                              key={index}
                              value={value}
                              className="pl-6"
                            >
                              {label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )
                    )}
                  </SelectContent>
                </Select>
              </Field>
            );
          }}
        />
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <div className="w-full p-4 bg-muted/50 rounded-lg border">
          <h3 className="text-lg mb-2 text-foreground">結果</h3>
          <p className="text-2xl text-primary whitespace-break-spaces">
            {result ? `${result.date} ${result.time}` : `點擊轉換，輸出結果`}
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}

export default App;
