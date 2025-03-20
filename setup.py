from setuptools import setup, find_packages

setup(
    name='fall-detection-system',
    version='0.1',
    packages=find_packages(),
    install_requires=[
        'numpy',
        'paho-mqtt',
        'curses',
        'pandas',
        'scikit-learn',
        'tensorflow'
    ],
    author='Joseph Scanlin',
    description='Fall Detection System',
    long_description=open('README.md').read() if os.path.exists('README.md') else '',
)
