/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

import './style.scss';
import 'lineupjs/src/style.scss';
import 'font-awesome/scss/font-awesome.scss';
import {onDOMNodeRemoved, mixin} from 'phovea_core/src';
import {ITable} from 'phovea_core/src/table';
import {Range} from 'phovea_core/src/range';
import {defaultSelectionType, hoverSelectionType} from 'phovea_core/src/idtype';
import {AVisInstance, IVisInstance, assignVis} from 'phovea_core/src/vis';
import LineUpImpl from 'lineupjs/src/lineup';
import {LocalDataProvider} from 'lineupjs/src/provider';

function deriveColumns(columns: any[]) {
  return columns.map((col) => {
    var r: any = {
      column: col.desc.name
    };
    if (col.desc.color) {
      r.color = col.desc.color;
    } else if (col.desc.cssClass) {
      r.cssClass = col.desc.cssClass;
    }

    //use magic word to find extra attributes
    if (col.desc.lineup) {
      Object.keys(col.desc.lineup).forEach((k) => {
        r[k] = col.desc.lineup[k];
      });
    }
    var val = col.desc.value;
    switch (val.type) {
      case 'string':
        r.type = 'string';
        break;
      case 'categorical':
        r.type = 'categorical';
        r.categories = col.desc.categories;
        break;
      case 'real':
      case 'int':
        r.type = 'number';
        r.domain = val.range;
        break;
      default:
        r.type = 'string';
        break;
    }
    return r;
  });
}

export interface ILineUpOptions {
  rowNames?: boolean;
  dump?: any;
  lineup?: any;

  sortCriteria?: {column: string, asc: boolean};

  scale?: number[];
  rotate?: number;
}

export class LineUp extends AVisInstance implements IVisInstance {
  private options: ILineUpOptions = {
    rowNames: false
  };

  private _node: HTMLDivElement;
  private lineup: LineUpImpl;
  private provider: LocalDataProvider;

  constructor(public data: ITable, parent: Element, options: ILineUpOptions = {}) {
    super();
    mixin(this.options, options);

    this._node = this.build();
    parent.appendChild(this._node);
    assignVis(this._node, this);
  }

  get rawSize(): [number, number] {
    const dim = this.data.dim;
    return [Math.min(dim[1] * 100, 1000), Math.min(dim[0] * 20, 600)];
  }

  get node() {
    return this._node;
  }

  private build() {
    const div = document.createElement('div');
    const rowNames = this.options.rowNames === true;
    const columns = deriveColumns(this.data.cols());

    if (rowNames) {
      columns.unshift({type: 'string', label: 'Row', column: '_name'});
    }

    const listener = (event, act: Range) => {
      if (this.lineup) {
        this.lineup.data.setSelection(act.dim(0).asList());
      }
    };
    this.data.on('select-selected', listener);
    onDOMNodeRemoved(div, () => {
      this.data.off('select-selected', listener);
    });

    // bind data to chart
    Promise.all(<any[]>[this.data.objects(), this.data.rowIds(), rowNames ? this.data.rows() : Promise.resolve([])]).then((promise) => {
      const arr: any[] = promise[0];
      const rowIds: number[] = promise[1].dim(0).asList();
      const names: string[] = promise[2];

      const data = arr.map((obj, i) => {
        return mixin({
          _name: names[i],
          _id: rowIds[i]
        }, obj);
      });

      this.provider = new LocalDataProvider(data, columns);
      if (this.options.dump) {
        this.provider.restore(this.options.dump);
      }

      this.lineup = new LineUpImpl(div, this.provider, this.options.lineup);
      this.lineup.on('hoverChanged', (data_index) => {
        var id = null;
        if (data_index < 0) {
          this.data.clear(hoverSelectionType);
        } else {
          id = data[data_index]._id;
          this.data.select(hoverSelectionType, [data_index]);
        }
        this.fire(hoverSelectionType, id);
      });
      this.lineup.on('multiSelectionChanged', (data_indices) => {
        if (data_indices.length === 0) {
          this.data.clear(defaultSelectionType);
        } else {
          this.data.select(defaultSelectionType, data_indices);
        }
        this.fire(defaultSelectionType, data_indices.length === 0 ? null : data[data_indices[0]]._id);
      });
      this.provider.deriveDefault();


      const sortCriteria = this.options.sortCriteria;
      if (sortCriteria) {
        this.lineup.sortBy((d) => d.label === sortCriteria.column, sortCriteria.asc);
      }

      this.lineup.update();
      this.data.selections().then((act) => {
        if (!act.isNone) {
          listener(null, act);
        }
      });

      this.markReady();
    });

    return div;
  }

  transform(scale?: number[], rotate?: number) {
    const bak = {
      scale: this.options.scale || [1, 1],
      rotate: this.options.rotate || 0
    };
    if (arguments.length === 0) {
      return bak;
    }
    this.node.style.transform = `rotate(${rotate}deg)scale(${scale[0]},${scale[1]})`;
    const new_ = { scale, rotate };
    this.fire('transform', new_, bak);
    this.options.scale = scale;
    this.options.rotate = rotate;
    return new_;
  }

  update() {
    if (this.lineup) {
      this.lineup.update();
    }
  }
}

export function create(data: ITable, parent: Element, options?: ILineUpOptions) {
  return new LineUp(data, parent, options);
};