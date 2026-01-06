import React from 'react';

const InstallPage = () => {
  const packages = [
    {
      name: 'Clash Verge (Windows)',
      fileName: 'Clash.Verge_2.4.3+autobuild.1017.886d1a5_x64-setup.exe',
      os: 'Windows 10/11 (x64)',
      version: '2.4.3',
      url: 'https://unen-install-local.oss-cn-beijing.aliyuncs.com/Clash.Verge_2.4.3%2Bautobuild.1017.886d1a5_x64-setup.exe',
    },
    {
      name: 'CMFA (Android)',
      fileName: 'cmfa-2.11.18-meta-universal-release.apk',
      os: 'Android',
      version: '2.11.18',
      url: 'https://unen-install-local.oss-cn-beijing.aliyuncs.com/cmfa-2.11.18-meta-universal-release.apk',
    },
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">应用下载</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.name} className="border rounded-lg p-6 shadow-md bg-white dark:bg-gray-800">
            <h2 className="text-2xl font-semibold mb-2">{pkg.name}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-1">操作系统: {pkg.os}</p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">版本: {pkg.version}</p>
            <a
              href={pkg.url}
              download
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
            >
              下载 ({pkg.fileName})
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InstallPage;
