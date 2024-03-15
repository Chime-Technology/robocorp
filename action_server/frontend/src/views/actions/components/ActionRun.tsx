import { FC, FormEvent, ReactNode, useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Form,
  Header,
  Input,
  Select,
  Typography,
} from '@robocorp/components';

import { runAction } from '~/lib/requestData';
import { Action, ActionPackage, AsyncLoaded } from '~/lib/types';
import { Code } from '~/components';
import { toKebabCase, stringifyResult } from '~/lib/helpers';
import { useActionServerContext } from '~/lib/actionServerContext';
import { useLocalStorage } from '~/lib/useLocalStorage';
import { formDatatoPayload, propertiesToFormData, PropertyFormData } from '~/lib/formData';

type Props = {
  action: Action;
  actionPackage: ActionPackage;
};

type RunResult = string | number | boolean | undefined;

const dataLoadedInitial: AsyncLoaded<RunResult> = {
  data: undefined,
  isPending: false,
};

const Item: FC<{ children?: ReactNode; title?: string; name: string }> = ({
  children,
  title,
  name,
}) => {
  const indent = name.split('.').length - 1;
  return (
    <Box pl={indent * 16}>
      {title && (
        <Typography mb="$8" variant="display.small">
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
};

export const ActionRun: FC<Props> = ({ action, actionPackage }) => {
  const [apiKey, setApiKey] = useLocalStorage<string>('api-key', '');
  const { serverConfig } = useActionServerContext();
  const [formData, setFormData] = useState<PropertyFormData[]>([]);
  const [result, setResult] = useState<AsyncLoaded<RunResult>>(dataLoadedInitial);

  useEffect(() => {
    setFormData(propertiesToFormData(JSON.parse(action.input_schema)));
  }, [action, actionPackage]);

  const handleInputChange = useCallback(
    (value: string, index: number) => {
      setFormData((curr) => curr.map((item, idx) => (idx === index ? { ...item, value } : item)));
      setResult(dataLoadedInitial);
    },
    [action, actionPackage, dataLoadedInitial, formData],
  );

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (action?.name && actionPackage?.name) {
        runAction(
          toKebabCase(actionPackage.name),
          toKebabCase(action.name),
          formDatatoPayload(formData),
          setResult,
          serverConfig?.auth_enabled ? apiKey : undefined,
        );
      }
    },
    [action, actionPackage, formData],
  );

  return (
    <Form busy={result.isPending} onSubmit={onSubmit}>
      {serverConfig?.auth_enabled && (
        <Form.Fieldset>
          <Input
            label="API Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </Form.Fieldset>
      )}
      <Form.Fieldset>
        {formData.map((item, index) => {
          const title = `${item.property.title}${item.required ? ' *' : ''}`;

          switch (item.property.type) {
            case 'boolean':
              return (
                <Item title={item.title} name={item.name} key={item.name}>
                  <Checkbox
                    key={item.name}
                    label={title}
                    description={item.property.description}
                    checked={item.value === 'True'}
                    required={item.required}
                    onChange={(e) => handleInputChange(e.target.checked ? 'True' : 'False', index)}
                  />
                </Item>
              );
            case 'number':
            case 'integer':
              return (
                <Item title={item.title} name={item.name} key={item.name}>
                  <Input
                    key={item.name}
                    label={title}
                    description={item.property.description}
                    required={item.required}
                    value={item.value}
                    type="number"
                    onChange={(e) => handleInputChange(e.target.value, index)}
                  />
                </Item>
              );
            case 'object':
              return (
                <Item title={item.title} name={item.name} key={item.name}>
                  <Input
                    key={item.name}
                    label={title}
                    description={item.property.description}
                    required={item.required}
                    value={item.value}
                    rows={4}
                    onChange={(e) => handleInputChange(e.target.value, index)}
                  />
                </Item>
              );
            case 'enum':
              return (
                <Item title={item.title} name={item.name} key={item.name}>
                  <Select
                    key={item.name}
                    label={title}
                    description={item.property.description}
                    required={item.required}
                    value={item.value}
                    items={item.options?.map((value) => ({ label: value, value })) || []}
                    onChange={(e) => handleInputChange(e, index)}
                  />
                </Item>
              );
            case 'string':
            default:
              return (
                <Item title={item.title} name={item.name} key={item.name}>
                  <Input
                    key={item.name}
                    label={title}
                    description={item.property.description}
                    rows={1}
                    required={item.required}
                    value={item.value}
                    onChange={(e) => handleInputChange(e.target.value, index)}
                  />
                </Item>
              );
          }
        })}
      </Form.Fieldset>
      <Button.Group align="right">
        <Button loading={result.isPending} type="submit" variant="primary">
          Run
        </Button>
      </Button.Group>
      {!result.isPending && (result.data !== undefined || result.errorMessage) && (
        <>
          <Header size="small">
            <Header.Title title="Result" />
          </Header>
          <Code lineNumbers={false} value={result.errorMessage || stringifyResult(result.data)} />
        </>
      )}
    </Form>
  );
};
