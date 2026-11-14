# JupyterLite with JupyterGIS

A Python environment that runs entirely in the browser, for students without Python on their machine.
Published at https://semanticgis.org/the-technology-stack/processing-environments/jupytergis/lite/ and built by
`.github/workflows/deploy-pages.yml` after the Quartz build.

- `content/`: the notebooks and data students see in the file browser.
- `environment.yml`: the packages of the browser kernel (xeus-python, from emscripten-forge and conda-forge).
  `webcolors` and `jupytergis-lite` (which provides the import name `jupytergis`) are needed by JupyterGIS's
  Python API.
- `jupyter_lite_config.json`: lets the file browser open `.jGIS` map files.

Build locally (needs the micromamba binary on PATH):

```sh
micromamba create -n jlite -c conda-forge python=3.12 pip jupyterlite-core=0.8.7 jupyterlite-xeus=6.0.0 jupyter_server
micromamba run -n jlite pip install jupytergis-lite==0.18.1
cd jupyterlite && micromamba run -n jlite jupyter lite build --contents content --output-dir _output
python -m http.server -d _output 8765
```

A GeoPackage cannot be written straight into the file browser's storage (SQLite needs a normal file system):
write it to `/tmp` and copy it across. The starter notebook shows how.
