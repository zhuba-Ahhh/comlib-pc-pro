import { Data, INPUTS, OUTPUTS } from '../constants';
import { Schemas } from '../schema';

export default [
  {
    title: '操作配置',
    items: [
      {
        title: '动态配置操作',
        description: '开启后可以通过连线，修改操作配置',
        type: 'switch',
        value: {
          get({ data }: EditorResult<Data>) {
            return data.useOperationDynamic;
          },
          set({ data, input }: EditorResult<Data>, val: boolean) {
            data.useOperationDynamic = !!val;
            if (val && !input.get(INPUTS.SetOpConfig)) {
              input.add(
                INPUTS.SetOpConfig,
                '修改操作配置',
                Schemas.SetOpConfig
              );
            }
            if (!val && input.get(INPUTS.SetOpConfig)) {
              input.remove(INPUTS.SetOpConfig);
            }
          }
        }
      },
      {
        title: '实时保存',
        description: '无需保存，修改后会立即同步数据',
        type: 'switch',
        value: {
          get({ data }: EditorResult<Data>) {
            return data.useAutoSave;
          },
          set({ data }: EditorResult<Data>, val: boolean) {
            data.useAutoSave = !!val;
          }
        }
      },
      {
        title: '点击切换编辑态',
        description: '点击单元格切换到编辑态',
        type: 'switch',
        value: {
          get({ data }: EditorResult<Data>) {
            return data.clickChangeToedit;
          },
          set({ data }: EditorResult<Data>, val: boolean) {
            data.clickChangeToedit = !!val;
          }
        }
      },
      {
        title: '隐藏操作列',
        description: '隐藏操作列，会自动隐藏所有操作',
        type: 'switch',
        value: {
          get({ data }: EditorResult<Data>) {
            return data.hideAllOperation;
          },
          set({ data }: EditorResult<Data>, val: boolean) {
            data.hideAllOperation = !!val;
          }
        }
      },
      {
        title: '隐藏新增按钮',
        type: 'switch',
        value: {
          get({ data }: EditorResult<Data>) {
            return data.hideAddBtn;
          },
          set({ data }: EditorResult<Data>, val: boolean) {
            data.hideAddBtn = !!val;
          }
        }
      }
    ]
  },
  {
    title: '可展开行配置',
    items: [
      {
        title: '父节点行数据只读',
        description: '开启后，含children字段的数据行禁止编辑',
        type: 'switch',
        value: {
          get({ data }: EditorResult<Data>) {
            return data.readonlyWhenHasChildren;
          },
          set({ data }: EditorResult<Data>, val: boolean) {
            data.readonlyWhenHasChildren = !!val;
          }
        }
      }
    ]
  },
  {
    title: '勾选配置',
    items: [
      {
        title: '勾选',
        description: '开启后，数据支持勾选',
        type: 'switch',
        value: {
          get({ data }: EditorResult<Data>) {
            return data.useRowSelection;
          },
          set({ data, input, output }: EditorResult<Data>, val: boolean) {
            data.useRowSelection = !!val;
            const hasInputEvent = input.get(INPUTS.GetRowSelect);
            const hasOutputEvent = input.get(OUTPUTS.GetRowSelect);
            if (val) {
              !hasInputEvent &&
                input.add(INPUTS.GetRowSelect, '获取勾选数据', Schemas.Void);
              !hasOutputEvent &&
                output.add(
                  OUTPUTS.GetRowSelect,
                  '勾选数据输出',
                  Schemas.GetRowSelect(data)
                );
              input.get(OUTPUTS.GetRowSelect)?.setRels([OUTPUTS.GetRowSelect]);
            } else {
              hasInputEvent && input.remove(INPUTS.GetRowSelect);
              hasOutputEvent && output.remove(OUTPUTS.GetRowSelect);
            }
          }
        }
      },
      {
        title: '勾选标识',
        type: 'text',
        description: '行唯一标识字段，默认为_key',
        options: {
          placeholder: '行唯一标识字段，默认为_key'
        },
        ifVisible({ data }: EditorResult<Data>) {
          return data.useRowSelection;
        },
        value: {
          get({ data }: EditorResult<Data>) {
            return data.selectionRowKey;
          },
          set({ data }: EditorResult<Data>, value: string) {
            data.selectionRowKey = value;
          }
        }
      },
      {
        title: '动态设置勾选项',
        type: 'Switch',
        ifVisible({ data }: EditorResult<Data>) {
          return data.useRowSelection;
        },
        value: {
          get({ data }: EditorResult<Data>) {
            return data.useSetSelectedRowKeys;
          },
          set({ data, input }: EditorResult<Data>, value: boolean) {
            data.useSetSelectedRowKeys = value;
            const hasEvent = input.get(INPUTS.SetRowSelect);
            if (value) {
              !hasEvent &&
                input.add(
                  INPUTS.SetRowSelect,
                  '设置勾选项',
                  Schemas.SetRowSelect
                );
            } else {
              hasEvent && input.remove(INPUTS.SetRowSelect);
            }
          }
        }
      }
    ]
  },
  {
    title: '事件',
    items: [
      {
        title: '数据变化事件',
        description: '开启数据变化事件',
        type: 'switch',
        value: {
          get({ data }: EditorResult<Data>) {
            return data.useChangeEvent;
          },
          set({ data, output }: EditorResult<Data>, val: boolean) {
            const hasEvent = output.get(OUTPUTS.ChangeEvent);
            if (val) {
              !hasEvent &&
                output.add(
                  OUTPUTS.ChangeEvent,
                  '数据变化',
                  Schemas.ChangeEvent(data)
                );
            } else {
              hasEvent && output.remove(OUTPUTS.ChangeEvent);
            }
            data.useChangeEvent = !!val;
          }
        }
      },
      {
        title: '数据变化事件',
        type: '_Event',
        ifVisible({ data, output }: EditorResult<Data>) {
          return !!(data.useChangeEvent && output.get(OUTPUTS.ChangeEvent));
        },
        options: {
          outputId: OUTPUTS.ChangeEvent
        }
      }
    ]
  }
];
