/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

//register all extensions in the registry following the given pattern
module.exports = function(registry) {
  //registry.push('extension-type', 'extension-id', function() { return System.import('./src/extension_impl'); }, {});
  registry.push('vis', 'phovea-vis-lineup', function() { return System.import('./src'); }, {
 'name': 'LineUp',
 'sizeDependsOnDataDimension': [
  false,
  true
 ],
 'filter': 'table'
});
};

