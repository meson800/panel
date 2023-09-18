importScripts("https://cdn.jsdelivr.net/pyodide/v0.23.4/pyc/pyodide.js");

function sendPatch(patch, buffers, msg_id) {
  self.postMessage({
    type: 'patch',
    patch: patch,
    buffers: buffers
  })
}

async function startApplication() {
  console.log("Loading pyodide!");
  self.postMessage({type: 'status', msg: 'Loading pyodide'})
  self.pyodide = await loadPyodide();
  self.pyodide.globals.set("sendPatch", sendPatch);
  console.log("Loaded!");
  await self.pyodide.loadPackage("micropip");
  const env_spec = ['https://cdn.holoviz.org/panel/1.2.3/dist/wheels/bokeh-3.2.2-py3-none-any.whl', 'https://cdn.holoviz.org/panel/1.2.3/dist/wheels/panel-1.2.3-py3-none-any.whl', 'pyodide-http==0.2.1']
  for (const pkg of env_spec) {
    let pkg_name;
    if (pkg.endsWith('.whl')) {
      pkg_name = pkg.split('/').slice(-1)[0].split('-')[0]
    } else {
      pkg_name = pkg
    }
    self.postMessage({type: 'status', msg: `Installing ${pkg_name}`})
    try {
      await self.pyodide.runPythonAsync(`
        import micropip
        await micropip.install('${pkg}');
      `);
    } catch(e) {
      console.log(e)
      self.postMessage({
	type: 'status',
	msg: `Error while installing ${pkg_name}`
      });
    }
  }
  console.log("Packages loaded!");
  self.postMessage({type: 'status', msg: 'Executing code'})
  const code = `
  
import asyncio

from panel.io.pyodide import init_doc, write_doc

init_doc()

import json

import panel as pn



pn.extension('codeeditor', 'deckgl', template='bootstrap')

pn.pane.Markdown('\\nThis example demonstrates how to \`jslink\` a JSON editor to a DeckGL pane to enable super fast, live editing of a plot:\\n\\n').servable()

MAPBOX_KEY = "pk.eyJ1IjoicGFuZWxvcmciLCJhIjoiY2s1enA3ejhyMWhmZjNobjM1NXhtbWRrMyJ9.B_frQsAVepGIe-HiOJeqvQ"



json_spec = {

    "initialViewState": {

        "bearing": -27.36,

        "latitude": 52.2323,

        "longitude": -1.415,

        "maxZoom": 15,

        "minZoom": 5,

        "pitch": 40.5,

        "zoom": 6

    },

    "layers": [{

        "@@type": "HexagonLayer",

        "autoHighlight": True,

        "coverage": 1,

        "data": "https://raw.githubusercontent.com/uber-common/deck.gl-data/master/examples/3d-heatmap/heatmap-data.csv",

        "elevationRange": [0, 3000],

        "elevationScale": 50,

        "extruded": True,

        "getPosition": "@@=[lng, lat]",

        "id": "8a553b25-ef3a-489c-bbe2-e102d18a3211", "pickable": True

    }],

    "mapStyle": "mapbox://styles/mapbox/dark-v9",

    "views": [{"@@type": "MapView", "controller": True}]

}





view_editor = pn.widgets.CodeEditor(

    value=json.dumps(json_spec['initialViewState'], indent=4),

    theme= 'monokai', width=500, height=225

)

layer_editor = pn.widgets.CodeEditor(

    value=json.dumps(json_spec['layers'][0], indent=4),

    theme= 'monokai', width=500, height=365

)



deck_gl = pn.pane.DeckGL(json_spec, mapbox_api_key=MAPBOX_KEY, sizing_mode='stretch_width', height=600)



view_editor.jscallback(args={'deck_gl': deck_gl}, value="deck_gl.initialViewState = JSON.parse(cb_obj.code)")

layer_editor.jscallback(args={'deck_gl': deck_gl}, value="deck_gl.layers = [JSON.parse(cb_obj.code)]")



pn.Row(pn.Column(view_editor, layer_editor), deck_gl).servable()

pn.state.template.title = 'Deck.gl JSON Editor'

await write_doc()
  `

  try {
    const [docs_json, render_items, root_ids] = await self.pyodide.runPythonAsync(code)
    self.postMessage({
      type: 'render',
      docs_json: docs_json,
      render_items: render_items,
      root_ids: root_ids
    })
  } catch(e) {
    const traceback = `${e}`
    const tblines = traceback.split('\n')
    self.postMessage({
      type: 'status',
      msg: tblines[tblines.length-2]
    });
    throw e
  }
}

self.onmessage = async (event) => {
  const msg = event.data
  if (msg.type === 'rendered') {
    self.pyodide.runPythonAsync(`
    from panel.io.state import state
    from panel.io.pyodide import _link_docs_worker

    _link_docs_worker(state.curdoc, sendPatch, setter='js')
    `)
  } else if (msg.type === 'patch') {
    self.pyodide.globals.set('patch', msg.patch)
    self.pyodide.runPythonAsync(`
    state.curdoc.apply_json_patch(patch.to_py(), setter='js')
    `)
    self.postMessage({type: 'idle'})
  } else if (msg.type === 'location') {
    self.pyodide.globals.set('location', msg.location)
    self.pyodide.runPythonAsync(`
    import json
    from panel.io.state import state
    from panel.util import edit_readonly
    if state.location:
        loc_data = json.loads(location)
        with edit_readonly(state.location):
            state.location.param.update({
                k: v for k, v in loc_data.items() if k in state.location.param
            })
    `)
  }
}

startApplication()