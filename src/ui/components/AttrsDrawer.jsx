
import React, { useCallback, useState, useEffect } from 'react';
import { Drawer } from 'antd';
import ReactJson from 'react-json-view';

const AttrsDrawer = ({ hash, getAttrs, onCancel, updateAttrs }) => {
  const [val, setVal] = useState(hash);
  const change = useCallback((all) => {
    const { updated_src, namespace, name } = all;
    updateAttrs(
      hash,
      namespace[0] || name,
      updated_src[namespace[0] || name],
      all
    );
  }, [updateAttrs, hash]);

  useEffect(() => {
    if (hash && getAttrs) {
      getAttrs(hash).then((res) => {
        setVal(res);
      });
    } else {
      onCancel();
      getAttrs();
    }
  }, [getAttrs, hash, onCancel]);

  if (typeof val !== 'object' || !hash) {
    return null;
  }

  return (
    <Drawer mask={false} onClose={onCancel} visible={hash}>
      <ReactJson
        style={{ fontSize: 12 }}
        onAdd={change}
        onEdit={change}
        onDelete={change}
        src={val}
      />
    </Drawer>
  );
};

export default AttrsDrawer;
