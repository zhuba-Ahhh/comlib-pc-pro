import React, { Suspense, useRef, useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import {
  Spin,
  DatePicker,
  TreeSelect,
  Checkbox,
  Cascader,
  Select,
  Tag,
  Input,
  Switch,
  InputNumber
} from 'antd';
import { TableRowSelection } from 'antd/lib/table/interface';
import debounce from 'lodash/debounce';
import {
  INPUTS,
  OUTPUTS,
  Data,
  DataSourceType,
  defaultData,
  TypeEnum,
  getDefaultColumns
} from './constants';
import { uuid } from '../utils';
import {
  addChildByKey,
  deleteItemByKey,
  formatColumn,
  formatDataSource,
  formatSubmitDataSource,
  getAllDsKey
} from './utils';
import styles from './style.less';
// @ts-ignore
import css from '@ant-design/pro-table/dist/table.min.css';
import { getTemplateRenderScript } from '../utils/runExpCodeScript';

const hackTreeShaking = (v) => v;
hackTreeShaking(css);
// @ts-ignore
const EditableProTable = React.lazy(() => import('./importTable'));

const swapArr = (arr: any[], idx1: number, idx2: number) => {
  if (arr[idx1] && arr[idx2]) {
    const temp = arr[idx1];
    arr[idx1] = arr[idx2];
    arr[idx2] = temp;
  }
  return arr;
};
const { RangePicker } = DatePicker;
export default function ({ data, slots, inputs, outputs, env, logger }: RuntimeParams<Data>) {
  const wrapRef = useRef();
  const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
  const [dataSource, setDataSource] = useState<DataSourceType[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  // 表格列配置
  const [colsCfg, setColsCfg] = useState<any>({});

  const rowKey = data.useRowSelection && data.selectionRowKey ? data.selectionRowKey : '_key';

  useEffect(() => {
    if (env.edit) {
      if (data.columns && data.columns.length <= 0) {
        data.columns = getDefaultColumns();
      }
      setDataSource(defaultData);
    } else {
      inputs[INPUTS.SetColConfig]((val) => {
        setColsCfg(val);
      });
      inputs[INPUTS.SetDataSource]((val) => {
        if (Array.isArray(val)) {
          const dataSource = formatDataSource(val, data.columns);
          setDataSource(dataSource);
        } else {
          console.error('可编辑表格：输入数据格式非法，输入数据必须是数组');
          logger?.error?.('输入数据格式非法，输入数据必须是数组');
        }
      });

      // 动态修改操作配置
      if (data.useOperationDynamic && inputs[INPUTS.SetOpConfig]) {
        inputs[INPUTS.SetOpConfig]((val) => {
          const dataKey = [
            'useAutoSave',
            'hideAllOperation',
            'hideAddBtn',
            'hideModifyBtn',
            'hideDeleteBtn',
            'hideDeleteBtnInEdit',
            'hideSaveBtn',
            'hideCancelBtn'
          ];
          dataKey.forEach((key) => {
            if (val && typeof val[key] === 'boolean') {
              data[key] = val[key];
            }
          });
        });
      }

      // 动态设置勾选项
      if (data.useSetSelectedRowKeys && inputs[INPUTS.SetRowSelect]) {
        inputs[INPUTS.SetRowSelect]((val) => {
          const newSelectedRowKeys: Array<any> = [];
          (Array.isArray(val) ? val : [val]).forEach((selected) => {
            const selectedKey = typeof selected === 'object' ? selected?.[rowKey] : selected;
            if (selectedKey) {
              newSelectedRowKeys.push(selectedKey);
            }
          });
          setSelectedRowKeys(newSelectedRowKeys);
        });
      }

      // 监听插槽输出数据
      if (slots) {
        Object.keys(slots).forEach((slot) => {
          const slotOutput = slots[slot]?.outputs[OUTPUTS.EditTableData];
          if (slotOutput) {
            slotOutput((value: any) => {
              if (value !== undefined) {
                data.columns.map((column) => {
                  if (column?.slotEditId === slot) {
                    column?.[value?._key](value?.[column?.dataIndex as any]);
                  }
                });
              }
            });
          }
        });
      }
    }
  }, []);

  useEffect(() => {
    if (env.runtime && data.useRowSelection && inputs[INPUTS.GetRowSelect]) {
      inputs[INPUTS.GetRowSelect]((val, relOutputs) => {
        relOutputs[OUTPUTS.GetRowSelect] &&
          relOutputs[OUTPUTS.GetRowSelect]({
            selectedRowKeys,
            selectedRows: formatSubmitDataSource(
              dataSource.filter((item) => selectedRowKeys.includes(item?.[rowKey]))
            )
          });
      });
    }
  }, [selectedRowKeys, dataSource]);

  const debouncedChangeEventOutput = useCallback(
    debounce((val) => {
      outputs[OUTPUTS.ChangeEvent](val);
    }, 200),
    []
  );
  useEffect(() => {
    if (env.runtime) {
      inputs[INPUTS.Submit]((val, relOutputs) => {
        relOutputs[OUTPUTS.Submit](formatSubmitDataSource(dataSource));
      });
      inputs[INPUTS.AddRow] &&
        inputs[INPUTS.AddRow]((val: any) => {
          if (val) {
            const newDataSource = formatDataSource([...dataSource, { _key: uuid() }], data.columns);
            setDataSource(newDataSource);
          }
        });
      data.useDelDataSource &&
        inputs[INPUTS.DelRow] &&
        inputs[INPUTS.DelRow]((val) => {
          val = Array.isArray(val) ? val : [val];
          const delKeys: any[] = val.map((item) => item?.[rowKey]).filter((item) => item);
          const newDataSource = formatDataSource(
            dataSource.filter((item) => !delKeys.includes(item?.[rowKey])),
            data.columns
          );
          setDataSource(newDataSource);
        });

      if (data.useMoveDataSource) {
        inputs[INPUTS.MoveDown] &&
          inputs[INPUTS.MoveDown]((val) => {
            const currKey: string = val?.[rowKey];
            const idx = dataSource.findIndex((item) => currKey === item?.[rowKey]);
            if (idx !== -1 && idx < dataSource.length - 1) {
              const newDataSource = formatDataSource(
                swapArr([...dataSource], idx, idx + 1),
                data.columns
              );
              setDataSource(newDataSource);
            }
          });
        inputs[INPUTS.MoveUp] &&
          inputs[INPUTS.MoveUp]((val) => {
            const currKey: string = val?.[rowKey];
            const idx = dataSource.findIndex((item) => currKey === item?.[rowKey]);
            if (idx !== -1 && idx > 0) {
              const newDataSource = formatDataSource(
                swapArr([...dataSource], idx, idx - 1),
                data.columns
              );
              setDataSource(newDataSource);
            }
          });
      }

      if (data.useChangeEvent && outputs[OUTPUTS.ChangeEvent]) {
        debouncedChangeEventOutput(dataSource);
      }
    }
  }, [dataSource]);

  const findLabelByOptions = (value, options) => {
    let res;
    (options || []).forEach((item) => {
      if (res !== undefined) {
        return;
      } else if (item.value === value) {
        res = item.label;
      } else if (Array.isArray(item.children)) {
        res = findLabelByOptions(value, item.children);
      }
    });
    return res;
  };
  const getValueByOptions = (value, options) => {
    if (!Array.isArray(value)) {
      const temp = findLabelByOptions(value, options);
      return temp === undefined ? value : temp;
    } else {
      return value.map((item) => getValueByOptions(item, options));
    }
  };
  const renderTagList = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => <Tag key={`tag-${item}`}>{item}</Tag>);
    }
    return value;
  };
  const runDisableScript = (disableScript, record) => {
    if (disableScript && record) {
      try {
        const disabled = eval(getTemplateRenderScript(disableScript))(record);
        return disabled;
      } catch (e) {
        console.error('动态禁用出错：' + e);
        return true;
      }
    }
    return undefined;
  };

  const getColumns = (dataSource: DataSourceType[]) => {
    const col = formatColumn(data, env, colsCfg);
    return col.map((item, colIdx) => {
      const { disableScript } = item;
      switch (item.valueType) {
        case TypeEnum.Option:
          item.render = (_, record, idx, action) => {
            let editable = true;
            if (typeof item.editable === 'function') {
              editable = item.editable(_, record, idx);
            }
            const { addChildBtnScript } = data;
            if (addChildBtnScript) {
              try {
                item.showAddChildBtn = eval(getTemplateRenderScript(addChildBtnScript))(record);
              } catch (e) {
                // console.log(e);
              }
            } else {
              item.showAddChildBtn = true;
            }
            return [
              !data.hideModifyBtn && editable && (
                <a
                  key="editable"
                  onClick={() => {
                    if (env.edit) return;
                    action?.startEditable?.(record?.[rowKey]);
                  }}
                >
                  编辑
                </a>
              ),
              !data.hideDeleteBtn && (
                <a
                  key="delete"
                  onClick={() => {
                    if (env.edit) return;
                    setDataSource(deleteItemByKey(dataSource, record?.[rowKey], rowKey));
                    if (data.useDelCallback) {
                      outputs[OUTPUTS.DelCallback](record);
                    }
                  }}
                >
                  删除
                </a>
              ),
              !data.hideAllAddChildBtn && (!!env.edit || item.showAddChildBtn) && (
                <a
                  key="addChild"
                  onClick={() => {
                    if (env.edit) return;
                    const newExpandedRowKeys = [...expandedRowKeys, record?.[rowKey]].filter(
                      (item, inx, self) => item && self.indexOf(item) === inx
                    );
                    setExpandedRowKeys(newExpandedRowKeys);
                    setDataSource(addChildByKey(dataSource, record?.[rowKey], rowKey));
                  }}
                >
                  {data.addChildBtnLabel}
                </a>
              )
            ];
          };
          break;
        case TypeEnum.Slot as any:
          // 赋值插槽数据
          const extractValues = (record: { [x: string]: any; index: number }) => {
            const slotRowValue = {};
            let slotColValue = null;
            let rowIndex = record?._key || 0;

            for (let key in record) {
              if (key !== 'index') {
                slotRowValue[key] = record[key];
              }

              if (key === item.dataIndex) {
                slotColValue = record[key];
              }
            }

            rowIndex = dataSource.findIndex((item: any) => item?._key === record?._key);

            return { slotRowValue, slotColValue, rowIndex };
          };
          const SlotItem = (props) => {
            const { record, isEditable, onChange } = props;
            if (!data.columns[colIdx][record?._key]) data.columns[colIdx][record?._key] = onChange;
            const renderValue = {
              inputValues: extractValues(record),
              key: `${record?._key}`
            };
            if (
              isEditable ||
              (item?.slotEditId && slots[item.slotEditId] && slots[item.slotEditId].size === 0)
            ) {
              return item.slotId && slots[item.slotId] && slots[item.slotId].render(renderValue);
            }
            return (
              item?.slotEditId &&
              slots[item.slotEditId] &&
              slots[item.slotEditId].render(renderValue)
            );
          };

          item.renderFormItem = (schema, config) => {
            const { entity } = schema as any;
            const { record } = config;
            return (
              <SlotItem
                record={entity}
                isEditable={runDisableScript(disableScript, record || entity)}
              />
            );
          };
          item.render = (_, record, idx, action) => {
            return (
              <div
                key={JSON.stringify(record[`${item.dataIndex}`])}
                onClick={() => {
                  if (env.edit || !data.clickChangeToedit) return;
                  action?.startEditable?.(record?.[rowKey]);
                }}
              >
                {item.slotId &&
                  slots[item.slotId] &&
                  slots[item.slotId].render({
                    inputValues: extractValues(record),
                    key: `${record?._key}-slotId`
                  })}
                {env.edit &&
                  item?.slotEditId &&
                  slots[item.slotEditId] &&
                  slots[item.slotEditId].render({
                    inputValues: extractValues(record),
                    key: `${record?._key}-slotEditId`
                  })}
              </div>
            );
          };
          break;
        case TypeEnum.Date:
          item.renderFormItem = (schema, config) => {
            const { entity } = schema as any;
            const { record } = config;
            return (
              <DatePicker
                placeholder={'请选择'}
                showTime={item.showTime}
                disabled={runDisableScript(disableScript, record || entity)}
              />
            );
          };
          item.render = (_, record, idx, action) => {
            const format = item.showTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD';
            const value = record[`${item.dataIndex}`];
            return (
              <div
                onClick={() => {
                  if (env.edit || !data.clickChangeToedit) return;
                  action?.startEditable?.(record?.[rowKey]);
                }}
              >
                {value ? moment(value).format(format) : '-'}
              </div>
            );
          };
          break;
        case TypeEnum.Select:
          item.renderFormItem = (schema, config) => {
            const { entity } = schema as any;
            const { record } = config;
            return (
              <Select
                placeholder={'请选择'}
                mode={item.multiple ? 'multiple' : undefined}
                showSearch={item.showSearch}
                {...item.fieldProps}
                disabled={runDisableScript(disableScript, record || entity)}
              />
            );
          };
          item.render = (_, record, idx, action) => {
            const value = record[`${item.dataIndex}`];
            const options = (item.fieldProps as any).options;
            return (
              <div
                onClick={() => {
                  if (env.edit || !data.clickChangeToedit) return;
                  action?.startEditable?.(record?.[rowKey]);
                }}
              >
                {renderTagList(getValueByOptions(value, options))}
              </div>
            );
          };
          break;
        case TypeEnum.Cascader:
          item.renderFormItem = (schema, config) => {
            const { entity } = schema as any;
            const { record } = config;
            return (
              <Cascader
                placeholder={'请选择'}
                multiple={item.multiple}
                showSearch={item.showSearch}
                {...item.fieldProps}
                disabled={runDisableScript(disableScript, record || entity)}
              />
            );
          };
          item.render = (_, record, idx, action) => {
            const value = record[`${item.dataIndex}`];
            const options = (item.fieldProps as any).options;
            const strList = getValueByOptions(value, options) || [];
            let returnDom = null;
            if (Array.isArray(strList)) {
              returnDom = renderTagList(
                item.multiple
                  ? strList.map((str) => (Array.isArray(str) ? str.join('/') : str))
                  : strList.join('/')
              );
            }
            return (
              <div
                onClick={() => {
                  if (env.edit || !data.clickChangeToedit) return;
                  action?.startEditable?.(record?.[rowKey]);
                }}
              >
                {returnDom}
              </div>
            );
          };
          break;
        case TypeEnum.TreeSelect as any:
          item.renderFormItem = (schema, config) => {
            const { entity } = schema as any;
            const { record } = config;
            return (
              <TreeSelect
                placeholder={'请选择'}
                multiple={item.multiple}
                showSearch={item.showSearch}
                getPopupContainer={() => wrapRef.current}
                treeNodeFilterProp="label"
                {...item.fieldProps}
                disabled={runDisableScript(disableScript, record || entity)}
              />
            );
          };
          item.render = (_, record, idx, action) => {
            const value = record[`${item.dataIndex}`];
            const options = (item.fieldProps as any).treeData;
            return (
              <div
                onClick={() => {
                  if (env.edit || !data.clickChangeToedit) return;
                  action?.startEditable?.(record?.[rowKey]);
                }}
              >
                {renderTagList(getValueByOptions(value, options))}
              </div>
            );
          };
          break;
        case TypeEnum.Checkbox:
          item.renderFormItem = (schema, config) => {
            const { entity } = schema as any;
            const { record } = config;
            return (
              <Checkbox.Group
                {...(item.fieldProps as any)}
                disabled={runDisableScript(disableScript, record || entity)}
              />
            );
          };
          item.render = (_, record, idx, action) => {
            const value = record[`${item.dataIndex}`];
            return (
              <div
                onClick={() => {
                  if (env.edit || !data.clickChangeToedit) return;
                  action?.startEditable?.(record?.[rowKey]);
                }}
              >
                <Checkbox.Group {...(item.fieldProps as any)} disabled={true} value={value} />
              </div>
            );
          };
          break;
        case TypeEnum.DateRange:
          item.renderFormItem = (schema, config) => {
            const { entity } = schema as any;
            const { record } = config;
            return (
              <RangePicker
                placeholder={['开始日期', '结束日期']}
                showTime={item.showTime}
                disabled={runDisableScript(disableScript, record || entity)}
              />
            );
          };
          item.render = (_, record, idx, action) => {
            const value = record[`${item.dataIndex}`];
            const format = item.showTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD';
            return (
              <div
                onClick={() => {
                  if (env.edit || !data.clickChangeToedit) return;
                  action?.startEditable?.(record?.[rowKey]);
                }}
              >
                {Array.isArray(value)
                  ? value.map((time) => moment(time).format(format)).join(' 至 ')
                  : '-'}
              </div>
            );
          };
          break;
        case TypeEnum.Text:
          item.renderFormItem = (schema, config) => {
            const { entity } = schema as any;
            const { record } = config;
            return (
              <Input
                {...item.fieldProps}
                disabled={runDisableScript(disableScript, record || entity)}
              />
            );
          };
          item.render = (_, record, idx, action) => {
            const value = record[`${item.dataIndex}`];
            return (
              <div
                onClick={() => {
                  if (env.edit || !data.clickChangeToedit) return;
                  action?.startEditable?.(record?.[rowKey]);
                }}
              >
                {value}
              </div>
            );
          };
          break;
        case TypeEnum.Number:
          item.renderFormItem = (schema, config) => {
            const { entity } = schema as any;
            const { record } = config;
            return (
              <InputNumber
                {...item.fieldProps}
                disabled={runDisableScript(disableScript, record || entity)}
              />
            );
          };
          item.render = (_, record, idx, action) => {
            const value = record[`${item.dataIndex}`];
            return (
              <div
                onClick={() => {
                  if (env.edit || !data.clickChangeToedit) return;
                  action?.startEditable?.(record?.[rowKey]);
                }}
              >
                {value}
              </div>
            );
          };
          break;
        case TypeEnum.Switch:
          item.renderFormItem = (schema, config) => {
            const { entity } = schema as any;
            const { record } = config;
            let defaultChecked: boolean;
            if (typeof entity?.[String(item?.dataIndex)] === 'boolean') {
              defaultChecked = entity?.[String(item?.dataIndex)];
            } else {
              defaultChecked = item.fieldProps?.['defaultChecked'];
            }
            return (
              <Switch
                {...item.fieldProps}
                defaultChecked={defaultChecked}
                disabled={runDisableScript(disableScript, record || entity)}
              />
            );
          };
          item.render = (_, record, idx, action) => {
            const value = record[`${item.dataIndex}`];
            return (
              <div
                onClick={() => {
                  if (env.edit || !data.clickChangeToedit) return;
                  action?.startEditable?.(record?.[rowKey]);
                }}
              >
                {value}
              </div>
            );
          };
          break;
        default:
          break;
      }
      return item;
    });
  };

  // 勾选配置
  const rowSelection: TableRowSelection<any> = {
    selectedRowKeys,
    preserveSelectedRowKeys: true,
    onChange: (selectedRowKeys: any[]) => {
      if (env.edit) return;
      setSelectedRowKeys(selectedRowKeys);
    }
  };
  return (
    <div className={styles['fz-editable-table']} ref={wrapRef}>
      <Suspense fallback={<Spin tip="Loading..." />}>
        <EditableProTable<DataSourceType>
          rowKey={rowKey}
          recordCreatorProps={
            data.hideAddBtn
              ? false
              : {
                  parentKey: uuid(),
                  newRecordType: data.useAutoSave ? 'dataSource' : undefined,
                  creatorButtonText: data.creatorButtonText,
                  record: () => ({ _key: uuid(), [rowKey]: uuid(), _add: true }),
                  disabled: !!env?.edit
                  /** TODO: 编辑态禁止添加行数据 */
                }
          }
          value={dataSource}
          columns={getColumns(dataSource)}
          onChange={(value) => {
            setDataSource(value);
          }}
          scroll={{
            x: '100%'
          }}
          size={data.size || 'middle'}
          rowSelection={data.useRowSelection && rowSelection}
          tableAlertRender={false}
          expandable={{
            expandedRowKeys,
            onExpand: (expanded: boolean, record: RecordType) => {
              const newExpandedRowKeys = expanded
                ? [...expandedRowKeys, record?.[rowKey]]
                : expandedRowKeys.filter((key) => key !== record?.[rowKey]);
              setExpandedRowKeys(newExpandedRowKeys);
            }
          }}
          editable={{
            type: 'multiple',
            editableKeys,
            onChange: setEditableRowKeys,
            onSave: (key, value) => {
              if (data.useSaveCallback) {
                outputs[OUTPUTS.SaveCallback](value);
              }
              return Promise.resolve();
            },
            onDelete: (key, value) => {
              if (data.useDelCallback) {
                outputs[OUTPUTS.DelCallback](value);
              }
              return Promise.resolve();
            },
            actionRender: (row, config, defaultDoms) => {
              return [
                !data.hideSaveBtn && defaultDoms.save,
                !data.hideDeleteBtnInEdit && defaultDoms.delete,
                !data.hideCancelBtn && defaultDoms.cancel
              ].filter((item) => !!item);
            },
            onValuesChange: (record, recordList: DataSourceType[]) => {
              if (data.useAutoSave) {
                setDataSource(
                  recordList
                    .filter((item) => !!item?._key)
                    .map((item, index) => ({ ...item, index }))
                );
              }
            }
          }}
        />
      </Suspense>
    </div>
  );
}
